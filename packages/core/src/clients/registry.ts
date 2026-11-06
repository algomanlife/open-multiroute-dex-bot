/**
 * DEX client registry — maps TradingView alert exchange names to concrete
 * clients. Clients are constructed lazily so missing credentials for one
 * DEX never break startup for the others.
 */
import { AbstractDexClient } from "./base.js";
import { BluefinDexClient } from "./bluefin/bluefinClient.js";
import { DydxV4Client } from "./dydx_v4/dydxV4Client.js";
import { GmxClient } from "./gmx/gmxClient.js";
import { PerpClient } from "./perp/perpClient.js";
import { HyperliquidClient } from "./hyperliquid/hyperliquidClient.js";

type ClientFactory = () => AbstractDexClient;

const clientFactories: Record<string, ClientFactory> = {
  dydxv4: () => new DydxV4Client(),
  dydx: () => new DydxV4Client(),
  perpetual: () => new PerpClient(),
  gmx: () => new GmxClient(),
  bluefin: () => new BluefinDexClient(),
  hyperliquid: () => new HyperliquidClient()
};

export class DexRegistry {
  private readonly instances = new Map<string, AbstractDexClient>();

  getDex(dexKey: string): AbstractDexClient | undefined {
    const factory = clientFactories[dexKey.toLowerCase()];
    if (!factory) return undefined;
    if (!this.instances.has(dexKey)) {
      this.instances.set(dexKey, factory());
    }
    return this.instances.get(dexKey);
  }

  getAllDexKeys(): string[] {
    return Object.keys(clientFactories);
  }
}
