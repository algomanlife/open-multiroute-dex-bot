/** TradingView webhook receiver — the alert entrypoint. */
import type { FastifyInstance } from "fastify";
import { getEngine } from "../lib/engine.js";
import { prisma } from "../lib/prisma.js";
import { broadcastHub } from "../lib/ws.js";
import { logger } from "../lib/logger.js";
import {
  OmdbError,
  UnknownExchangeError,
  AccountNotReadyError
} from "@omdb/core";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/webhook",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const userId =
        typeof request.query === "object" &&
        request.query !== null &&
        "userId" in request.query
          ? String((request.query as { userId: unknown }).userId)
          : null;

      const engine = getEngine();
      let outcome;
      try {
        outcome = await engine.route(request.body);
      } catch (error) {
        if (error instanceof OmdbError) {
          const statusCode =
            error instanceof UnknownExchangeError || error instanceof AccountNotReadyError
              ? error.statusCode
              : 400;
          await persistAlert(userId, request.body, false, error.message);
          broadcastHub.publish({ type: "alert", data: { accepted: false, reason: error.message } });
          return reply.code(statusCode).send({ accepted: false, reason: error.message });
        }
        logger.error({ error }, "Webhook routing failed unexpectedly");
        await persistAlert(userId, request.body, false, "internal error");
        return reply.code(500).send({ accepted: false, reason: "internal error" });
      }

      await persistAlert(userId, request.body, outcome.accepted, outcome.reason ?? null);
      broadcastHub.publish({ type: "alert", data: outcome });

      if (outcome.accepted) return reply.code(200).send({ accepted: true });
      return reply.code(200).send({
        accepted: false,
        reason: outcome.reason
      });
    }
  );

  async function persistAlert(
    userId: string | null,
    payload: unknown,
    accepted: boolean,
    reason: string | null
  ): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          userId,
          exchange: extractField(payload, "exchange") ?? "unknown",
          strategy: extractField(payload, "strategy") ?? "unknown",
          payload: (payload ?? {}) as object,
          accepted,
          reason
        }
      });
    } catch (error) {
      logger.error({ error }, "Failed to persist alert log");
    }
  }
}

function extractField(payload: unknown, field: string): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}
