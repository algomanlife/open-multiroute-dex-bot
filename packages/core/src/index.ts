/** Public API of `@omdb/core`. */
export * from "./types/index.js";
export * from "./errors.js";
export { alertSchema, SUPPORTED_EXCHANGES, validateAlert } from "./trading/alert.js";
export { TradingEngine } from "./trading/engine.js";
export { DexRegistry } from "./clients/registry.js";
export {
  AbstractDexClient,
  type OrderFilledEvent
} from "./clients/base.js";
export {
  config,
  withRetry,
  doubleSizeIfReverseOrder,
  getDecimalPointLength,
  recordOrderResult,
  getStrategyStore,
  setStrategyStore,
  InMemoryStrategyStore
} from "./utils/index.js";
export type { StrategyStore } from "./utils/index.js";
export { sleep } from "./utils/index.js";
