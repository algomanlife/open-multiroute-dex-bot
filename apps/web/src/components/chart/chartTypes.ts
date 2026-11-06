/** Shared types for the Chart & Signals feature. */

export type SignalConfig = {
  exchange: string;
  strategy: string;
  size: number;
  autoRouteJsonAlerts: boolean;
};

export type FeedEntry = {
  id: number;
  time: string;
  source: string;
  text: string;
  tone: "ok" | "err" | "info";
};

export type ChartAlertEvent = {
  message: string;
  title?: string;
  time: number;
  indicator?: string;
};

export type ChartBarEvent = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PriceWatcher = {
  price: number;
  direction: "above" | "below";
};
