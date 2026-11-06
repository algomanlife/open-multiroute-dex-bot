/**
 * Strategy state store — replaces the legacy `node-json-db` file store.
 *
 * The engine tracks per-strategy position state (first order flag, reverse
 * mode, net position) to decide order sizing. Persistence is delegated to an
 * injectable `StrategyStore` interface so the API layer can back it with
 * Prisma/PostgreSQL while tests use the in-memory implementation.
 */
import type { StrategyState } from "../types/index.js";

export interface StrategyStore {
  get(strategy: string): StrategyState | undefined;
  upsert(strategy: string, state: StrategyState): void;
  all(): Record<string, StrategyState>;
  clear(): void;
}

export class InMemoryStrategyStore implements StrategyStore {
  private readonly states = new Map<string, StrategyState>();

  get(strategy: string): StrategyState | undefined {
    return this.states.get(strategy);
  }

  upsert(strategy: string, state: StrategyState): void {
    this.states.set(strategy, { ...state });
  }

  all(): Record<string, StrategyState> {
    return Object.fromEntries(this.states.entries());
  }

  clear(): void {
    this.states.clear();
  }
}

/** Process-wide default store (swappable via `setStrategyStore`). */
let activeStore: StrategyStore = new InMemoryStrategyStore();

export function setStrategyStore(store: StrategyStore): void {
  activeStore = store;
}

export function getStrategyStore(): StrategyStore {
  return activeStore;
}
