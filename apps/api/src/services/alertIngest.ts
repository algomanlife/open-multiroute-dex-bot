/**
 * Shared alert ingestion: used by both the public TradingView webhook
 * (passphrase-protected) and the authenticated dashboard signal endpoint.
 */
import { getEngine } from "../lib/engine.js";
import { prisma } from "../lib/prisma.js";
import { broadcastHub } from "../lib/ws.js";
import { logger } from "../lib/logger.js";
import { OmdbError } from "@omdb/core";

export type IngestResult = {
  status: number;
  body: { accepted: boolean; reason?: string; simulated?: boolean };
};

export async function processAlert(
  userId: string | null,
  payload: unknown,
  options: { checkPassphrase: boolean }
): Promise<IngestResult> {
  const engine = getEngine();
  // Trusted internal calls (dashboard signals) skip the client-supplied
  // passphrase: the server injects its own instead.
  const routed =
    options.checkPassphrase || typeof payload !== "object" || payload === null
      ? payload
      : {
          ...(payload as Record<string, unknown>),
          passphrase: process.env.WEBHOOK_PASSPHRASE ?? undefined
        };
  try {
    const outcome = await engine.route(routed);
    await persistAlert(userId, payload, outcome.accepted, outcome.reason ?? null);
    broadcastHub.publish({ type: "alert", data: outcome });
    if (outcome.accepted) {
      return { status: 200, body: { accepted: true } };
    }
    return { status: 200, body: { accepted: false, reason: outcome.reason } };
  } catch (error) {
    if (error instanceof OmdbError) {
      await persistAlert(userId, payload, false, error.message);
      broadcastHub.publish({
        type: "alert",
        data: { accepted: false, reason: error.message }
      });
      return { status: error.statusCode, body: { accepted: false, reason: error.message } };
    }
    logger.error({ error }, "Alert routing failed unexpectedly");
    await persistAlert(userId, payload, false, "internal error");
    return { status: 500, body: { accepted: false, reason: "internal error" } };
  }
}

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

function extractField(payload: unknown, field: string): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}
