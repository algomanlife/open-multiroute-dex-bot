/**
 * Gains Network (gains.trade) DEX client.
 *
 * Uses the official @gainstrade/api SDK with an agent-key signer (viem).
 * Test mode: GAINS_CHAIN defaults to "arbitrum-sepolia" (the Gains
 * testnet/demo environment exposed at demo.gains.trade) outside production,
 * so orders can be tested safely before going live.
 *
 * Env vars:
 *   GAINS_AGENT_KEY   — private key of the trading agent (required)
 *   GAINS_MASTER_KEY  — trader master key; when omitted the agent registers
 *                       itself as its own trading delegate (no on-chain tx)
 *   GAINS_RPC_URL     — JSON-RPC endpoint for the chain (required to trade)
 *   GAINS_CHAIN       — "arbitrum" (mainnet) or "arbitrum-sepolia" (demo)
 *   GAINS_LEVERAGE    — default leverage, e.g. "5"
 *   GAINS_COLLATERAL  — default collateral symbol (USDC)
 *   GAINS_SLIPPAGE    — market order slippage percent, e.g. "1"
 */
import { AbstractDexClient } from '../base.js';
import { AlertObject, OrderResult } from '../../types/index.js';
import { doubleSizeIfReverseOrder } from '../../utils/index.js';
import { createWalletClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { GainsClient as SdkGainsClient } from '@gainstrade/api';

export type GainsChain =
  | 'arbitrum'
  | 'arbitrum-sepolia'
  | 'base'
  | 'polygon'
  | 'megaeth';

/** Resolve the Gains REST base URL for a chain. */
export function gainsRestBase(chain: string): string {
  return chain === 'arbitrum'
    ? 'https://api.gains.trade/v1/arbitrum'
    : `https://api-testnet.gains.trade/v1/${chain}`;
}

/** Default chain: demo/testnet outside production. */
export function gainsDefaultChain(): GainsChain {
  return process.env.NODE_ENV === 'production'
    ? 'arbitrum'
    : 'arbitrum-sepolia';
}

/** Coerce the GAINS_CHAIN env var to a supported chain name. */
function resolveChain(envValue: string | undefined): GainsChain {
  const allowed: GainsChain[] = [
    'arbitrum',
    'arbitrum-sepolia',
    'base',
    'polygon',
    'megaeth'
  ];
  const value = (envValue ?? '').toLowerCase() as GainsChain;
  return allowed.includes(value) ? value : gainsDefaultChain();
}

/** Normalize alert market symbols ("BTC-USD"/"BTC_USD") to Gains "BTC/USD". */
export function toGainsMarket(market: string): string {
  if (market.includes('/')) return market.toUpperCase();
  return market
    .toUpperCase()
    .replace(/[-_]USD$/, '/USD')
    .replace(/[-_]USDT$/, '/USDT');
}

export type GainsPosition = {
  id: string;
  market: string;
  side: 'long' | 'short';
  size: string;
  leverage: string;
  openPrice: string;
  status: string;
};

export class GainsClient extends AbstractDexClient {
  private sdk: SdkGainsClient | null = null;

  /** Agent address (derived from GAINS_AGENT_KEY) or null. */
  get agentAddress(): string | null {
    if (!process.env.GAINS_AGENT_KEY) return null;
    try {
      return privateKeyToAccount(
        process.env.GAINS_AGENT_KEY as `0x${string}`
      ).address;
    } catch {
      return null;
    }
  }

  get chain(): GainsChain {
    return resolveChain(process.env.GAINS_CHAIN);
  }

  /** Lazily build the SDK client (also used by the API test routes). */
  async getClient(): Promise<SdkGainsClient | null> {
    if (this.sdk) return this.sdk;
    const agentKey = process.env.GAINS_AGENT_KEY;
    const rpcUrl = process.env.GAINS_RPC_URL;
    if (!agentKey || !rpcUrl) {
      console.log(
        'GAINS_AGENT_KEY and GAINS_RPC_URL are required to trade on Gains'
      );
      return null;
    }

    const { GainsClient: SdkClient, viemSender } = await import(
      '@gainstrade/api'
    );
    const chain = this.chain;
    const agent = privateKeyToAccount(agentKey as `0x${string}`);

    // Discover the signing chain (id, diamond, domain) from the API.
    const signing = await new SdkClient({ chain }).signingChain();
    const wallet = createWalletClient({
      account: agent,
      chain: defineChain({
        id: signing.chainId,
        name: 'gains',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } }
      }),
      transport: http(rpcUrl)
    });

    const client = new SdkClient({
      chain,
      agent,
      sender: viemSender(wallet)
    });

    // Register the agent. When no master key is configured the agent
    // registers itself as its own delegate (delegationTx === null, no tx).
    const masterKey = process.env.GAINS_MASTER_KEY;
    const master = masterKey
      ? privateKeyToAccount(masterKey as `0x${string}`)
      : agent;
    const { delegationTx } = await client.agents.authorize(master, {
      agent: agent.address,
      name: 'open-multiroute-dex-bot',
      scope: {
        markets: 'all',
        maxLeverage: '20',
        dailySpendCapUsd: '10000',
        expiresAt: null,
        permissions: 'trade'
      }
    });
    if (delegationTx !== null) {
      const masterWallet = createWalletClient({
        account: master,
        chain: wallet.chain,
        transport: http(rpcUrl)
      });
      await masterWallet.sendTransaction({
        to: delegationTx.to,
        data: delegationTx.data as `0x${string}`
      });
    }

    this.sdk = client;
    return client;
  }

  async getIsAccountReady(): Promise<boolean | undefined> {
    if (!process.env.GAINS_AGENT_KEY || !process.env.GAINS_RPC_URL) {
      return false;
    }
    try {
      const client = await this.getClient();
      if (!client) return false;
      await client.markets.list();
      return true;
    } catch (error) {
      console.error('Gains account readiness check failed', error);
      return false;
    }
  }

  async placeOrder(alertMessage: AlertObject): Promise<OrderResult | void> {
    const client = await this.getClient();
    if (!client) return;

    const market = toGainsMarket(alertMessage.market);
    const reduceOnly = alertMessage.position === 'flat';
    const side: 'long' | 'short' = reduceOnly
      ? alertMessage.order === 'buy'
        ? 'long'
        : 'short'
      : alertMessage.position === 'short'
        ? 'short'
        : 'long';

    let size = alertMessage.size ?? 0;
    if (!size && alertMessage.sizeUsd && alertMessage.price) {
      size = alertMessage.sizeUsd / alertMessage.price;
    }
    size = doubleSizeIfReverseOrder(alertMessage, size);
    if (!size) size = 0.01;

    const order = await client.orders.create({
      market,
      side,
      type: 'market',
      size: String(size),
      leverage: process.env.GAINS_LEVERAGE || '5',
      collateral: process.env.GAINS_COLLATERAL || 'USDC',
      slippage: process.env.GAINS_SLIPPAGE || '1',
      reduceOnly
    });

    // Gains fills come from the oracle network within seconds.
    let filled: Awaited<ReturnType<typeof order.waitForFill>> | null = null;
    try {
      filled = await order.waitForFill({ timeoutMs: 60_000 });
    } catch (error) {
      console.error('Gains order was not filled in time', error);
    }

    const orderResult: OrderResult = {
      size,
      side: side === 'long' ? 'BUY' : 'SELL',
      orderId: String(filled?.fill?.positionId ?? order.id)
    };

    await this.exportOrder(
      'Gains',
      alertMessage.strategy,
      orderResult,
      Number(filled?.fill?.price ?? alertMessage.price),
      market
    );

    return orderResult;
  }

  /** Fetch open positions for the agent account (Gains REST API). */
  async getPositions(): Promise<GainsPosition[]> {
    const address = this.agentAddress;
    if (!address) throw new Error('GAINS_AGENT_KEY is not configured');
    const response = await fetch(
      `${gainsRestBase(this.chain)}/account/${address}/positions`
    );
    if (!response.ok) {
      throw new Error(`Gains positions query failed: ${response.status}`);
    }
    const payload = (await response.json()) as
      | GainsPosition[]
      | { positions?: GainsPosition[] };
    return Array.isArray(payload) ? payload : (payload.positions ?? []);
  }
}
