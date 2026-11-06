/**
 * Session auth: Bearer token → Prisma Session lookup → request.user.
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

export type AuthedUser = {
  id: string;
  walletAddress: string;
  displayName: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthedUser;
  }
}

export function extractBearerToken(
  request: FastifyRequest
): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function resolveUser(
  request: FastifyRequest
): Promise<AuthedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });
  if (!session || session.expiresAt < new Date()) return null;
  return {
    id: session.user.id,
    walletAddress: session.user.walletAddress,
    displayName: session.user.displayName
  };
}

/** Fastify preHandler guard for authenticated routes. */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await resolveUser(request);
  if (!user) {
    await reply.code(401).send({ error: "Unauthorized" });
    return;
  }
  request.user = user;
}
