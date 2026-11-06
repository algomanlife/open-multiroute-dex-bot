/** SIWE authentication routes. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { generateNonce, parseSiweMessage, verifySiwe } from "../lib/siwe.js";
import { extractBearerToken, resolveUser, requireAuth } from "../plugins/auth.js";
import { logger } from "../lib/logger.js";

/** Nonce TTL store (single-instance in-memory; short-lived by design). */
const pendingNonces = new Map<string, number>();
const NONCE_TTL_MS = 10 * 60 * 1000;

function pruneNonces(): void {
  const now = Date.now();
  for (const [nonce, expiresAt] of pendingNonces) {
    if (expiresAt < now) pendingNonces.delete(nonce);
  }
}

const verifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1)
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/nonce", async (_request, reply) => {
    pruneNonces();
    const nonce = generateNonce();
    pendingNonces.set(nonce, Date.now() + NONCE_TTL_MS);
    return reply.code(200).send({ nonce });
  });

  app.post("/api/auth/verify", async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "message and signature required" });
    }
    const { message, signature } = parsed.data;

    let walletAddress: string | null = null;
    try {
      const parsedMessage = parseSiweMessage(message);
      const expiresAt = pendingNonces.get(parsedMessage.nonce);
      pendingNonces.delete(parsedMessage.nonce);
      if (!expiresAt || expiresAt < Date.now()) {
        return reply.code(401).send({ error: "nonce expired or unknown" });
      }
      walletAddress = verifySiwe(message, signature);
    } catch {
      return reply.code(400).send({ error: "malformed SIWE message" });
    }

    if (!walletAddress) {
      return reply.code(401).send({ error: "invalid signature" });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress }
    });

    const ttlHours = Number(process.env.AUTH_SESSION_TTL_HOURS ?? 168);
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + ttlHours * 3600 * 1000)
      }
    });

    logger.info({ walletAddress }, "SIWE sign-in succeeded");
    return reply.code(200).send({
      token,
      user: {
        walletAddress: user.walletAddress,
        displayName: user.displayName
      }
    });
  });

  app.get("/api/auth/me", { preHandler: [requireAuth] }, async (request) => {
    return {
      walletAddress: request.user?.walletAddress,
      displayName: request.user?.displayName
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = extractBearerToken(request);
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    return reply.code(200).send({ ok: true });
  });

  app.get("/api/auth/session", async (request, reply) => {
    const user = await resolveUser(request);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return reply.code(200).send({
      walletAddress: user.walletAddress,
      displayName: user.displayName
    });
  });
}
