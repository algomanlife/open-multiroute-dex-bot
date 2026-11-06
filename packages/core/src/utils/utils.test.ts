import { describe, expect, it, beforeEach } from "vitest";
import {
  InMemoryStrategyStore,
  setStrategyStore,
  getStrategyStore,
  getStrategiesDB,
  doubleSizeIfReverseOrder,
  getDecimalPointLength,
  withRetry
} from "./index.js";
import { config } from "./env.js";

describe("InMemoryStrategyStore", () => {
  it("upserts and reads back state", () => {
    const store = new InMemoryStrategyStore();
    store.upsert("s", { isFirstOrder: "true", reverse: false, position: 0 });
    expect(store.get("s")?.isFirstOrder).toBe("true");
    store.upsert("s", { isFirstOrder: "false", reverse: false, position: 5 });
    expect(store.get("s")?.position).toBe(5);
  });

  it("returns undefined for unknown strategies", () => {
    expect(new InMemoryStrategyStore().get("nope")).toBeUndefined();
  });

  it("clears all state", () => {
    const store = new InMemoryStrategyStore();
    store.upsert("s", { isFirstOrder: "true", reverse: false, position: 0 });
    store.clear();
    expect(Object.keys(store.all())).toHaveLength(0);
  });
});

describe("setStrategyStore", () => {
  it("swaps the active store", () => {
    const original = getStrategyStore();
    const fresh = new InMemoryStrategyStore();
    setStrategyStore(fresh);
    expect(getStrategyStore()).toBe(fresh);
    setStrategyStore(original);
  });
});

describe("getStrategiesDB compat shim", () => {
  beforeEach(() => setStrategyStore(new InMemoryStrategyStore()));

  it("push writes through to the strategy store", () => {
    const [db] = getStrategiesDB();
    db.push("/my-strategy/isFirstOrder", "false");
    expect(getStrategyStore().get("my-strategy")?.isFirstOrder).toBe("false");
  });

  it("coerces position pushes to numbers", () => {
    const [db] = getStrategiesDB();
    db.push("/my-strategy/position", 3);
    expect(getStrategyStore().get("my-strategy")?.position).toBe(3);
  });

  it("returns a root-data snapshot", () => {
    const [db, rootData] = getStrategiesDB();
    db.push("/s1/isFirstOrder", "false");
    void rootData;
    const [, fresh] = getStrategiesDB();
    expect(fresh["s1"]?.isFirstOrder).toBe("false");
  });
});

describe("doubleSizeIfReverseOrder", () => {
  beforeEach(() => setStrategyStore(new InMemoryStrategyStore()));

  it("doubles size on a reverse alert after the first order", () => {
    const store = getStrategyStore();
    store.upsert("r", { isFirstOrder: "false", reverse: true, position: 1 });
    expect(
      doubleSizeIfReverseOrder(
        { strategy: "r", reverse: true } as never,
        5
      )
    ).toBe(10);
  });

  it("keeps size on the first order", () => {
    expect(
      doubleSizeIfReverseOrder({ strategy: "r2", reverse: true } as never, 5)
    ).toBe(5);
  });

  it("keeps size when reverse is false", () => {
    const store = getStrategyStore();
    store.upsert("r3", { isFirstOrder: "false", reverse: false, position: 1 });
    expect(
      doubleSizeIfReverseOrder({ strategy: "r3", reverse: false } as never, 5)
    ).toBe(5);
  });
});

describe("getDecimalPointLength", () => {
  it("counts decimal places", () => {
    expect(getDecimalPointLength(1.234)).toBe(3);
    expect(getDecimalPointLength(5)).toBe(0);
  });
});

describe("withRetry", () => {
  it("returns the value on first success", async () => {
    expect(await withRetry(() => Promise.resolve(7))).toBe(7);
  });

  it("retries then succeeds", async () => {
    let attempts = 0;
    const value = await withRetry(
      () => {
        if (attempts++ === 0) throw new Error("boom");
        return Promise.resolve("ok");
      },
      { retries: 2, baseDelayMs: 1 }
    );
    expect(value).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("throws the last error after exhausting retries", async () => {
    await expect(
      withRetry(() => Promise.reject(new Error("always fails")), {
        retries: 1,
        baseDelayMs: 1
      })
    ).rejects.toThrow("always fails");
  });
});

describe("config (env-backed)", () => {
  it("reads defaults for a known path", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    expect(config.get<number>("Hyperliquid.User.slippage")).toBe(0.05);
    process.env.NODE_ENV = previous;
  });

  it("prefers environment overrides", () => {
    process.env.HYPERLIQUID_SLIPPAGE = "0.9";
    expect(config.get<number>("Hyperliquid.User.slippage")).toBe(0.9);
    delete process.env.HYPERLIQUID_SLIPPAGE;
  });

  it("throws for unknown paths", () => {
    expect(() => config.get("Nope.Missing.Path")).toThrow(/Unknown config/);
  });

  it("requireEnv throws when unset", () => {
    expect(() => config.requireEnv("DEFINITELY_NOT_SET_VAR")).toThrow(
      /DEFINITELY_NOT_SET_VAR/
    );
  });
});
