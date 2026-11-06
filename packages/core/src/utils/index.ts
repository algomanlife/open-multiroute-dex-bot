/**
 * Shared utilities (ported from the upstream `helper.ts`, minus the JsonDB
 * dependency). Strategy state now lives in the pluggable strategy store.
 */
import { AlertObject, OrderResult, StrategyState } from "../types/index.js";
import { getStrategyStore } from "./strategyStore.js";

export { sleep, sleep as _sleep } from "./retry.js";
export {
  getStrategyStore,
  setStrategyStore,
  InMemoryStrategyStore
} from "./strategyStore.js";
export type { StrategyStore } from "./strategyStore.js";
export { config } from "./env.js";
export { withRetry } from "./retry.js";

/**
 * Compatibility shim for the legacy `getStrategiesDB()` JsonDB helper still
 * used inside the ported GMX and Hyperliquid clients. `db.push(path, value)`
 * writes through to the active strategy store; `rootData` is a live snapshot.
 */
export function getStrategiesDB(): [
  { push(path: string, value: unknown): void },
  Record<string, StrategyState>
] {
  const store = getStrategyStore();
  const snapshot = (): Record<string, StrategyState> => {
    const all = store.all();
    for (const key of Object.keys(all)) {
      const state = all[key] as StrategyState & { [key: string]: unknown };
      if (typeof state.position === "string") state.position = Number(state.position);
    }
    return all as Record<string, StrategyState>;
  };
  const db = {
    push(path: string, value: unknown): void {
      const [, strategy, key] = path.split("/");
      if (!strategy || !key) return;
      const current =
        (store.get(strategy) as (StrategyState & { [key: string]: unknown }) | undefined) ??
        { isFirstOrder: "true", reverse: false, position: 0 };
      const coerced = key === "position" ? Number(value) : value;
      store.upsert(strategy, { ...current, [key]: coerced });
    }
  };
  return [db, snapshot()];
}

export const getDecimalPointLength = (value: number): number => {
  const parts = String(value).split(".");
  return parts[1]?.length ?? 0;
};

/**
 * Double the order size when a strategy uses `reverse` signals and the
 * current alert is not the first one (closing + flipping the position).
 */
export const doubleSizeIfReverseOrder = (
  alertMessage: AlertObject,
  orderSize: number
): number => {
  const state = getStrategyStore().get(alertMessage.strategy);
  if (alertMessage.reverse && state && state.isFirstOrder === "false") {
    return orderSize * 2;
  }
  return orderSize;
};

/** Record a filled order into the strategy store (position netting). */
export const recordOrderResult = (
  strategy: string,
  orderResult: OrderResult
): void => {
  const store = getStrategyStore();
  const existing = store.get(strategy);
  const signed = orderResult.side === "BUY" ? orderResult.size : -orderResult.size;
  store.upsert(strategy, {
    isFirstOrder: "false",
    reverse: existing?.reverse ?? false,
    position: (existing?.position ?? 0) + signed
  });
}
