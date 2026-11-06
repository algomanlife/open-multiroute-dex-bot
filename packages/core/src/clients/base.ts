/**
 * Base class for all DEX clients.
 *
 * Ported from the upstream `abstractDexClient.ts`. The legacy CSV/JsonDB
 * side effects are replaced by an `onOrderFilled` event: the trading engine
 * (or the API layer) subscribes and persists fills to PostgreSQL via Prisma.
 * Optional CSV export is kept for operators who want flat files.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { AlertObject, OrderResult } from "../types/index.js";
import { recordOrderResult } from "../utils/index.js";

export type OrderFilledEvent = {
  exchange: string;
  strategy: string;
  market: string;
  tradingviewPrice: number;
  orderResult: OrderResult;
};

type OrderFilledHandler = (event: OrderFilledEvent) => void | Promise<void>;

export abstract class AbstractDexClient {
  private static handlers = new Set<OrderFilledHandler>();

  /** Subscribe to order-fill events (used by the engine for persistence). */
  static onOrderFilled(handler: OrderFilledHandler): () => void {
    AbstractDexClient.handlers.add(handler);
    return () => AbstractDexClient.handlers.delete(handler);
  }

  abstract getIsAccountReady(): Promise<boolean | undefined>;

  /** Concrete clients may return their raw exchange response. */
  abstract placeOrder(alertMessage: AlertObject): Promise<unknown>;

  /**
   * Legacy-compatible export hook called by the ported clients
   * (`exportOrder(exchange, strategy, orderResult, price, market)`).
   * Delegates to the fill-event pipeline.
   */
  protected async exportOrder(
    exchange: string,
    strategy: string,
    orderResult: OrderResult,
    tradingviewPrice: number,
    market: string
  ): Promise<void> {
    await this.emitOrderFilled({
      exchange,
      strategy,
      market,
      tradingviewPrice,
      orderResult
    });
  }

  /**
   * Emit a fill event and update strategy state.
   * Called by concrete clients after an order is acknowledged.
   */
  protected async emitOrderFilled(event: OrderFilledEvent): Promise<void> {
    recordOrderResult(event.strategy, event.orderResult);
    await Promise.all(
      [...AbstractDexClient.handlers].map((handler) =>
        Promise.resolve(handler(event))
      )
    );
    if (process.env.OMDB_EXPORT_DIR) this.exportToCsv(event);
  }

  /** Optional CSV export (enabled via OMDB_EXPORT_DIR env var). */
  private exportToCsv(event: OrderFilledEvent): void {
    const dir = process.env.OMDB_EXPORT_DIR!;
    const file = path.join(dir, `tradeHistory_${event.exchange}.csv`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        "datetime,strategy,market,side,size,tradingview_price,order_id\n"
      );
    }
    const row = [
      new Date().toISOString(),
      event.strategy,
      event.market,
      event.orderResult.side,
      event.orderResult.size,
      event.tradingviewPrice,
      event.orderResult.orderId
    ].join(",");
    fs.appendFileSync(file, `\n${row}`);
  }
}
