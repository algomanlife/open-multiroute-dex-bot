/**
 * Engine wiring: DexRegistry + TradingEngine + Prisma persistence.
 * Fill events are persisted as Trade rows, positions are netted, and
 * everything is broadcast over WebSocket.
 */
import {
  DexRegistry,
  TradingEngine,
  type OrderFilledEvent
} from "@omdb/core";
import { prisma } from "./prisma.js";
import { broadcastHub } from "./ws.js";
import { logger } from "./logger.js";

export interface EngineDeps {
  onFill?: (event: OrderFilledEvent) => void | Promise<void>;
}

let engine: TradingEngine | null = null;

export function getEngine(): TradingEngine {
  if (engine) return engine;
  const registry = new DexRegistry();
  engine = new TradingEngine(
    (exchange) => registry.getDex(exchange),
    { accountReadyCheck: false }
  );
  TradingEngine.onOrderFilled(persistFill);
  return engine;
}

/** Override for tests. */
export function setEngine(custom: TradingEngine): void {
  engine = custom;
}

async function persistFill(event: OrderFilledEvent): Promise<void> {
  try {
    const { exchange, strategy, market, orderResult, tradingviewPrice } = event;
    await prisma.trade.create({
      data: {
        exchange,
        market,
        side: orderResult.side,
        size: orderResult.size,
        price: tradingviewPrice,
        orderId: orderResult.orderId || null,
        strategy,
        status: "FILLED"
      }
    });

    const signedSize =
      orderResult.side === "BUY" ? orderResult.size : -orderResult.size;
    const existing = await prisma.position.findFirst({
      where: { exchange, market, strategy, status: "OPEN" }
    });
    if (existing) {
      const newSize = existing.size + signedSize;
      if (Math.abs(newSize) < 1e-12) {
        await prisma.position.update({
          where: { id: existing.id },
          data: { size: 0, status: "CLOSED", closedAt: new Date() }
        });
      } else {
        await prisma.position.update({
          where: { id: existing.id },
          data: {
            size: newSize,
            side: newSize > 0 ? "LONG" : "SHORT"
          }
        });
      }
    } else {
      await prisma.position.create({
        data: {
          exchange,
          market,
          side: signedSize > 0 ? "LONG" : "SHORT",
          size: signedSize,
          entryPrice: tradingviewPrice,
          strategy
        }
      });
    }

    const trade = await prisma.trade.findFirst({
      where: { exchange, strategy },
      orderBy: { createdAt: "desc" }
    });
    broadcastHub.publish({ type: "trade", data: trade });
    broadcastHub.publish({ type: "position", data: { exchange, market } });
  } catch (error) {
    logger.error({ error }, "Failed to persist order fill");
  }
}
