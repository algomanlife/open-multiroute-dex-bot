/**
 * TradingView alert schema and business-rule validation.
 * Ported from the upstream `validateAlert.ts` with Zod for strict typing.
 */
import { z } from "zod";
import { AlertValidationError } from "../errors.js";
import { getStrategyStore } from "../utils/strategyStore.js";
import type { AlertObject, DexKey } from "../types/index.js";

export const SUPPORTED_EXCHANGES: readonly DexKey[] = [
  "dydxv4",
  "dydx",
  "perpetual",
  "gmx",
  "bluefin",
  "hyperliquid"
] as const;

export const alertSchema = z.object({
  exchange: z
    .string()
    .optional()
    .transform((value) => (value ? value.toLowerCase() : "dydx")),
  strategy: z.string().min(1, "strategy must not be empty"),
  market: z.string().min(1, "market must not be empty"),
  size: z.number().positive().optional(),
  sizeUsd: z.number().positive().optional(),
  sizeByLeverage: z.number().positive().optional(),
  order: z.enum(["buy", "sell"]),
  price: z.number(),
  position: z.enum(["long", "short", "flat"]),
  reverse: z.boolean(),
  passphrase: z.string().optional(),
  collateral: z.string().optional()
});

/**
 * Validate an incoming alert body. Throws {@link AlertValidationError} on
 * schema violations; returns the parsed alert together with a "skip" flag
 * when the alert is a first-order flat close (legacy upstream behaviour).
 */
export function validateAlert(
  raw: unknown
): { alert: AlertObject; skip: "first-flat-close" | null } {
  const parsed = alertSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AlertValidationError("Alert message is not valid", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }
  const alert = parsed.data as AlertObject;

  if (process.env.WEBHOOK_PASSPHRASE && alert.passphrase !== process.env.WEBHOOK_PASSPHRASE) {
    throw new AlertValidationError("Passphrase does not match configuration");
  }

  if (!SUPPORTED_EXCHANGES.includes(alert.exchange as DexKey)) {
    throw new AlertValidationError(
      `Exchange name must be one of: ${SUPPORTED_EXCHANGES.join(", ")}`,
      { exchange: alert.exchange }
    );
  }

  const store = getStrategyStore();
  const state = store.get(alert.strategy);

  if (!state) {
    store.upsert(alert.strategy, {
      isFirstOrder: "true",
      reverse: alert.reverse,
      position: 0
    });
  }

  const currentState = store.get(alert.strategy)!;
  if (alert.position === "flat" && currentState.isFirstOrder === "true") {
    return { alert, skip: "first-flat-close" };
  }

  return { alert, skip: null };
}
