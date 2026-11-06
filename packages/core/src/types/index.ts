/**
 * Shared domain types for Open Multiroute DEX Bot.
 *
 * The DEX-specific order param types preserve the upstream SDK typings
 * (dYdX v4 / Perpetual / GMX) so the ported clients keep compiling as-is.
 */
import type { PositionSide } from '@perp/sdk-curie';
import { gmxOrderType } from '../clients/gmx/constants.js';
import type { OrderSide as v4OrderSide } from '@dydxprotocol/v4-client-js';

export type DexKey =
  | 'dydxv4'
  | 'dydx'
  | 'perpetual'
  | 'gmx'
  | 'bluefin'
  | 'hyperliquid';

export type AlertObject = {
  exchange: string;
  strategy: string;
  market: string;
  size?: number;
  sizeUsd?: number;
  sizeByLeverage?: number;
  order: string;
  price: number;
  position: string;
  reverse: boolean;
  passphrase?: string;
  collateral?: string;
};

export type dydxV4OrderParams = {
  market: string;
  side: v4OrderSide;
  size: number;
  price: number;
};

export type perpOrderParams = {
  tickerSymbol: string;
  side: PositionSide;
  amountInput: number;
  isAmountInputBase: boolean;
  referralCode: string;
};

export type gmxOrderParams = {
  marketAddress: string;
  isLong: boolean;
  sizeUsd: number;
  price: number;
  collateral?: string;
};

export type gmxOrderResult = {
  txHash: string;
  sizeUsd: number;
  isLong: boolean;
};

export type GmxPositionResponse = {
  orderType: gmxOrderType;
  hasLongPosition?: boolean;
  positionSizeUsd?: number;
  collateralAmount?: number;
};

export interface OrderResult {
  size: number;
  side: string;
  orderId: string;
}

export type hyperliquidOrderParams = {
  coin: string;
  isBuy: boolean;
  size: string;
  price: string;
  reduceOnly: boolean;
  assetIndex: number;
};

/** Strategy state tracked across alerts (replaces the legacy JsonDB). */
export interface StrategyState {
  isFirstOrder: 'true' | 'false';
  reverse: boolean;
  position: number;
}

/** Result of routing one alert through the engine. */
export type RouteOutcome = {
  accepted: boolean;
  exchange: string;
  strategy: string;
  reason?: string;
  order?: OrderResult;
};
