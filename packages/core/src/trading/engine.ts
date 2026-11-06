/**
 * Trading engine — validates an alert, resolves the target DEX client and
 * routes the order. Order fills are emitted as events that the API layer
 * persists (trades, positions, alerts tables + WebSocket broadcast).
 */
import { AbstractDexClient, type OrderFilledEvent } from "../clients/base.js";
import {
  AccountNotReadyError,
  AlertValidationError,
  UnknownExchangeError
} from "../errors.js";
import type { AlertObject, RouteOutcome } from "../types/index.js";
import { validateAlert } from "./alert.js";
import { withRetry } from "../utils/retry.js";

export type GetClient = (exchange: string) => AbstractDexClient | undefined;

export class TradingEngine {
  constructor(
    private readonly getClient: GetClient,
    private readonly options: { accountReadyCheck?: boolean } = {}
  ) {}

  /** Validate + route one webhook alert. Never throws for user errors. */
  async route(raw: unknown): Promise<RouteOutcome> {
    let alert: AlertObject;
    try {
      const result = validateAlert(raw);
      if (result.skip) {
        return {
          accepted: false,
          exchange: result.alert.exchange,
          strategy: result.alert.strategy,
          reason: result.skip
        };
      }
      alert = result.alert;
    } catch (error) {
      if (error instanceof AlertValidationError) {
        return {
          accepted: false,
          exchange: typeof (raw as { exchange?: string })?.exchange === "string"
            ? (raw as { exchange: string }).exchange
            : "unknown",
          strategy: (raw as { strategy?: string })?.strategy ?? "unknown",
          reason: error.message
        };
      }
      throw error;
    }

    const client = this.getClient(alert.exchange);
    if (!client) {
      throw new UnknownExchangeError(
        alert.exchange,
        ["dydxv4", "perpetual", "gmx", "bluefin", "hyperliquid"]
      );
    }

    if (this.options.accountReadyCheck !== false) {
      const ready = await client.getIsAccountReady();
      if (!ready) throw new AccountNotReadyError(alert.exchange);
    }

    await withRetry(() => client.placeOrder(alert), {
      retries: 2,
      baseDelayMs: 400
    });

    return {
      accepted: true,
      exchange: alert.exchange,
      strategy: alert.strategy
    };
  }

  /** Subscribe to fill events (re-exported for convenience). */
  static onOrderFilled(
    handler: (event: OrderFilledEvent) => void | Promise<void>
  ): () => void {
    return AbstractDexClient.onOrderFilled(handler);
  }
}
