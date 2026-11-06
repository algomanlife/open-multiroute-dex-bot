/**
 * Environment-backed configuration, replacing the legacy `node-config`
 * YAML files. Keeps the dotted-path `config.get('Hyperliquid.User.slippage')`
 * call shape used by the ported DEX clients while sourcing everything from
 * environment variables with sensible defaults.
 */
import { ConfigError } from "../errors.js";

type Primitive = string | number | boolean;

interface Defaults {
  [key: string]: Primitive | Defaults;
}

const isProduction = process.env.NODE_ENV === "production";

/** Per-network defaults ported from the upstream config YAMLs. */
const defaults: Defaults = isProduction
  ? {
      Perpetual: {
        Network: { host: "https://mainnet.optimism.io/" },
        User: { slippage: 0.05 }
      },
      GMX: { Network: { host: "https://arb1.arbitrum.io/rpc" } },
      Hyperliquid: {
        Network: { host: "https://api.hyperliquid.xyz" },
        User: { slippage: 0.05, builderFee: 0 }
      },
      DydxV4: {
        IndexerConfig: {
          httpsEndpoint: "https://indexer.dydx.trade",
          wssEndpoint: "wss://indexer.dydx.trade/v4/w"
        },
        ValidatorConfig: {
          restEndpoint: "https://dydx-ops-rpc.kingnodes.com"
        }
      }
    }
  : {
      Perpetual: {
        Network: { host: "https://mainnet.optimism.io/" },
        User: { slippage: 0.05 }
      },
      GMX: { Network: { host: "http://127.0.0.1:8545" } },
      Hyperliquid: {
        Network: { host: "https://api.hyperliquid-testnet.xyz" },
        User: { slippage: 0.05, builderFee: 0 }
      },
      DydxV4: {
        IndexerConfig: {
          httpsEndpoint: "https://indexer.dydx.trade",
          wssEndpoint: "wss://indexer.dydx.trade/v4/w"
        },
        ValidatorConfig: {
          restEndpoint: "https://dydx-mainnet-full-rpc.public.blastapi.io"
        }
      }
    };

/** Friendly env-var aliases for common dotted config paths. */
const ENV_ALIASES: Record<string, string> = {
  "GMX.Network.host": "GMX_RPC_URL",
  "Hyperliquid.Network.host": "HYPERLIQUID_HOST",
  "Hyperliquid.User.slippage": "HYPERLIQUID_SLIPPAGE",
  "Hyperliquid.User.builderFee": "HYPERLIQUID_BUILDER_FEE",
  "Perpetual.Network.host": "PERP_RPC_URL",
  "Perpetual.User.slippage": "PERP_SLIPPAGE"
};

/** Environment variable override for a dotted config path, if defined. */
function envOverride(path: string): Primitive | undefined {
  const candidates = [
    ENV_ALIASES[path],
    path
      .split(".")
      .map((segment) => segment.toUpperCase())
      .join("_")
  ].filter((key): key is string => Boolean(key));
  const raw = candidates
    .map((key) => process.env[key])
    .find((value) => value !== undefined && value !== "");
  if (raw === undefined) return undefined;
  const asNumber = Number(raw);
  return !Number.isNaN(asNumber) ? asNumber : raw;
}

class Config {
  /** Read a dotted config path (env var wins over default). */
  get<T = Primitive>(path: string): T {
    const override = envOverride(path);
    if (override !== undefined) return override as T;

    let node: Primitive | Defaults = defaults;
    for (const segment of path.split(".")) {
      if (typeof node !== "object" || node === null || !(segment in node)) {
        throw new ConfigError(`Unknown config path: "${path}"`);
      }
      node = (node as Defaults)[segment]!;
    }
    return node as T;
  }

  /** Required env var accessor (fail fast with a clear message). */
  requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new ConfigError(
        `Required environment variable "${key}" is not set`
      );
    }
    return value;
  }

  util = {
    /** Legacy shim for `config.util.getEnv('NODE_ENV')`. */
    getEnv: (name: string): string => process.env[name] ?? "development"
  };
}

export const config = new Config();
