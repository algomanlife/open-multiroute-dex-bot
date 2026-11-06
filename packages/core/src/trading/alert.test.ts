import { describe, expect, it, beforeEach } from "vitest";
import { validateAlert, alertSchema } from "../trading/alert.js";
import {
  InMemoryStrategyStore,
  getStrategyStore,
  setStrategyStore
} from "../utils/index.js";

const validAlert = {
  exchange: "dydxv4",
  strategy: "my-strategy",
  market: "BTC-USD",
  order: "buy",
  price: 50000,
  position: "long",
  reverse: false,
  size: 0.1
};

describe("alertSchema", () => {
  it("parses a valid alert and lowercases the exchange", () => {
    const parsed = alertSchema.parse({ ...validAlert, exchange: "GMX" });
    expect(parsed.exchange).toBe("gmx");
  });

  it("defaults exchange to dydx when omitted", () => {
    const { exchange, ...rest } = validAlert;
    const parsed = alertSchema.parse(rest);
    expect(parsed.exchange).toBe("dydx");
  });

  it("rejects an invalid order side", () => {
    expect(() =>
      alertSchema.parse({ ...validAlert, order: "hold" })
    ).toThrow();
  });

  it("rejects an invalid position mode", () => {
    expect(() =>
      alertSchema.parse({ ...validAlert, position: "spread" })
    ).toThrow();
  });

  it("rejects an empty strategy", () => {
    expect(() =>
      alertSchema.parse({ ...validAlert, strategy: "" })
    ).toThrow();
  });
});

describe("validateAlert", () => {
  beforeEach(() => {
    setStrategyStore(new InMemoryStrategyStore());
    delete process.env.WEBHOOK_PASSPHRASE;
  });

  it("accepts a valid alert and initializes strategy state", () => {
    const result = validateAlert(validAlert);
    expect(result.skip).toBeNull();
    expect(result.alert.strategy).toBe("my-strategy");
  });

  it("rejects an unknown exchange", () => {
    expect(() =>
      validateAlert({ ...validAlert, exchange: "binance" })
    ).toThrow(/must be one of/);
  });

  it("rejects a wrong passphrase", () => {
    process.env.WEBHOOK_PASSPHRASE = "secret";
    expect(() =>
      validateAlert({ ...validAlert, passphrase: "wrong" })
    ).toThrow(/Passphrase/);
  });

  it("skips the first flat close order", () => {
    const result = validateAlert({ ...validAlert, position: "flat" });
    expect(result.skip).toBe("first-flat-close");
  });

  it("accepts a flat close after a previous order", () => {
    validateAlert(validAlert);
    // A filled order flips isFirstOrder (as exportOrder does in production).
    getStrategyStore().upsert("my-strategy", {
      isFirstOrder: "false",
      reverse: false,
      position: 0
    });
    const result = validateAlert({ ...validAlert, position: "flat" });
    expect(result.skip).toBeNull();
  });

  it("rejects a non-object payload", () => {
    expect(() => validateAlert("not-an-object")).toThrow();
    expect(() => validateAlert(null)).toThrow();
  });
});
