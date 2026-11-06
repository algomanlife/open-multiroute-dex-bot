import { describe, expect, it, beforeEach, vi } from "vitest";
import { TradingEngine } from "../trading/engine.js";
import { AbstractDexClient } from "../clients/base.js";
import { InMemoryStrategyStore, setStrategyStore } from "../utils/index.js";
import type { AlertObject } from "../types/index.js";

class FakeClient extends AbstractDexClient {
  lastAlert: AlertObject | null = null;
  ready = true;
  placeOrderCalls = 0;

  async getIsAccountReady(): Promise<boolean> {
    return this.ready;
  }

  async placeOrder(alert: AlertObject): Promise<void> {
    this.placeOrderCalls++;
    this.lastAlert = alert;
  }
}

const alert = {
  exchange: "hyperliquid",
  strategy: "test-strategy",
  market: "ETH",
  order: "buy",
  price: 3000,
  position: "long",
  reverse: false,
  size: 1
};

describe("TradingEngine", () => {
  beforeEach(() => {
    setStrategyStore(new InMemoryStrategyStore());
  });

  it("routes a valid alert to the matching client", async () => {
    const client = new FakeClient();
    const engine = new TradingEngine((exchange) =>
      exchange === "hyperliquid" ? client : undefined
    );
    const outcome = await engine.route(alert);
    expect(outcome.accepted).toBe(true);
    expect(client.placeOrderCalls).toBe(1);
    expect(client.lastAlert?.market).toBe("ETH");
  });

  it("rejects an invalid alert without touching any client", async () => {
    const client = new FakeClient();
    const engine = new TradingEngine(() => client);
    const outcome = await engine.route({ ...alert, order: "maybe" });
    expect(outcome.accepted).toBe(false);
    expect(outcome.reason).toMatch(/not valid/i);
    expect(client.placeOrderCalls).toBe(0);
  });

  it("skips a first flat close", async () => {
    const client = new FakeClient();
    const engine = new TradingEngine(() => client);
    const outcome = await engine.route({ ...alert, position: "flat" });
    expect(outcome.accepted).toBe(false);
    expect(outcome.reason).toBe("first-flat-close");
    expect(client.placeOrderCalls).toBe(0);
  });

  it("rejects an alert for an unknown exchange without routing", async () => {
    const client = new FakeClient();
    const engine = new TradingEngine(() => client);
    const outcome = await engine.route({ ...alert, exchange: "ftx" });
    expect(outcome.accepted).toBe(false);
    expect(outcome.reason).toMatch(/must be one of/);
    expect(client.placeOrderCalls).toBe(0);
  });

  it("throws when the account is not ready", async () => {
    const client = new FakeClient();
    client.ready = false;
    const engine = new TradingEngine(() => client);
    await expect(engine.route(alert)).rejects.toThrow(/not ready/);
  });

  it("retries failed orders with backoff", async () => {
    const client = new FakeClient();
    let failures = 0;
    const original = client.placeOrder.bind(client);
    client.placeOrder = async (a: AlertObject) => {
      if (failures++ < 2) throw new Error("transient network error");
      return original(a);
    };
    const engine = new TradingEngine(() => client);
    const outcome = await engine.route(alert);
    expect(outcome.accepted).toBe(true);
    expect(failures).toBe(3);
  });

  it("emits an order-filled event through AbstractDexClient", async () => {
    const handler = vi.fn();
    const unsubscribe = TradingEngine.onOrderFilled(handler);
    const client = new FakeClient();
    await client["emitOrderFilled"]({
      exchange: "fake",
      strategy: "s1",
      market: "BTC",
      tradingviewPrice: 1,
      orderResult: { size: 2, side: "BUY", orderId: "42" }
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "s1" })
    );
    unsubscribe();
    await client["emitOrderFilled"]({
      exchange: "fake",
      strategy: "s1",
      market: "BTC",
      tradingviewPrice: 1,
      orderResult: { size: 2, side: "BUY", orderId: "43" }
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
