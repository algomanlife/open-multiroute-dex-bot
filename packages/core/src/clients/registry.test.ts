import { describe, expect, it, vi } from "vitest";

// The Bluefin SDK pulls Sui bcs helpers that break in the test environment;
// only the registry mapping is under test here, so mock the module.
vi.mock("@bluefin-exchange/bluefin-v2-client", () => ({
  BluefinClient: class MockBluefinClient {},
  Networks: { PRODUCTION_SUI: "PRODUCTION_SUI" },
  ORDER_SIDE: { BUY: "BUY", SELL: "SELL" },
  ORDER_TYPE: { MARKET: "MARKET" }
}));

import { DexRegistry } from "./registry.js";

describe("DexRegistry", () => {
  it("lists all supported exchange keys", () => {
    const keys = new DexRegistry().getAllDexKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        "dydxv4",
        "dydx",
        "perpetual",
        "gmx",
        "bluefin",
        "hyperliquid"
      ])
    );
  });

  it("returns undefined for an unknown exchange", () => {
    expect(new DexRegistry().getDex("binance")).toBeUndefined();
  });

  it("caches a single instance per key", () => {
    const registry = new DexRegistry();
    const first = registry.getDex("gmx");
    const second = registry.getDex("gmx");
    expect(first).toBe(second);
  });

  it("maps the dydx alias to the same client class", () => {
    const registry = new DexRegistry();
    expect(registry.getDex("dydx")?.constructor).toBe(
      registry.getDex("dydxv4")?.constructor
    );
  });
});
