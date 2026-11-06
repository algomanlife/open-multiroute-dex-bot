/** Exchange credential management routes. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { encrypt } from "../lib/crypto.js";
import { requireAuth } from "../plugins/auth.js";
import { SUPPORTED_EXCHANGES } from "@omdb/core";

const createSchema = z.object({
  exchange: z.enum(["dydxv4", "perpetual", "gmx", "bluefin", "hyperliquid"]),
  label: z.string().min(1).max(64).default("default"),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1)
});

/** Env-var presence signals that an exchange client can trade. */
const EXCHANGE_ENV_KEYS: Record<string, string[]> = {
  dydxv4: ["DYDX_V4_PRIVATE_KEY", "DYDX_V4_MNEMONIC"],
  perpetual: ["PERP_PRIVATE_KEY"],
  gmx: ["GMX_PRIVATE_KEY"],
  bluefin: ["BLUEFIN_MNEMONIC"],
  hyperliquid: ["HYPERLIQUID_PRIVATE_KEY"]
};

function isExchangeReady(exchange: string): boolean {
  const keys = EXCHANGE_ENV_KEYS[exchange] ?? [];
  return keys.some((key) => Boolean(process.env[key]));
}

export async function exchangeRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/exchanges",
    { preHandler: [requireAuth] },
    async (request) => {
      const credentials = await prisma.exchangeCredential.findMany({
        where: { userId: request.user!.id },
        orderBy: { createdAt: "asc" }
      });
      return {
        exchanges: [
          ...SUPPORTED_EXCHANGES.filter((exchange) => exchange !== "dydx")
        ].map((exchange) => ({
          exchange,
          ready: isExchangeReady(exchange),
          hasStoredCredential: credentials.some(
            (credential) => credential.exchange === exchange
          ),
          labels: credentials
            .filter((credential) => credential.exchange === exchange)
            .map((credential) => credential.label)
        })),
        credentials: credentials.map((credential) => ({
          exchange: credential.exchange,
          label: credential.label,
          createdAt: credential.createdAt
        }))
      };
    }
  );

  app.post(
    "/api/exchanges",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(422).send({
          error: "Validation failed",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
      if (!encryptionKey) {
        return reply.code(503).send({
          error: "CREDENTIALS_ENCRYPTION_KEY is not configured"
        });
      }
      const { exchange, label, apiKey, apiSecret } = parsed.data;
      const encryptedKey = encrypt(
        JSON.stringify({ apiKey, apiSecret }),
        encryptionKey
      );
      const credential = await prisma.exchangeCredential.upsert({
        where: {
          userId_exchange_label: {
            userId: request.user!.id,
            exchange,
            label
          }
        },
        update: { encryptedKey },
        create: {
          userId: request.user!.id,
          exchange,
          label,
          encryptedKey
        }
      });
      return reply.code(201).send({
        exchange: credential.exchange,
        label: credential.label,
        createdAt: credential.createdAt
      });
    }
  );

  app.delete(
    "/api/exchanges/:exchange/:label",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { exchange, label } = request.params as {
        exchange: string;
        label: string;
      };
      const deleted = await prisma.exchangeCredential.deleteMany({
        where: { userId: request.user!.id, exchange, label }
      });
      return reply.code(200).send({ deleted: deleted.count });
    }
  );
}
