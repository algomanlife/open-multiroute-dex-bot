/** Typed REST client for the Open Multiroute DEX Bot API. */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "omdb_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ApiError(
      response.status,
      body.error ?? `Request failed with ${response.status}`
    );
  }
  return (await response.json()) as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

// ── Domain types ────────────────────────────────────────────────────────────

export type User = { walletAddress: string; displayName: string | null };

export type Trade = {
  id: string;
  exchange: string;
  market: string;
  side: string;
  size: number;
  price: number;
  orderId: string | null;
  strategy: string;
  pnl: number | null;
  status: string;
  createdAt: string;
};

export type Position = {
  id: string;
  exchange: string;
  market: string;
  side: string;
  size: number;
  entryPrice: number;
  strategy: string | null;
  status: string;
  openedAt: string;
};

export type Alert = {
  id: string;
  exchange: string;
  strategy: string;
  accepted: boolean;
  reason: string | null;
  createdAt: string;
};

export type ExchangeStatus = {
  exchange: string;
  ready: boolean;
  hasStoredCredential: boolean;
  labels: string[];
};

export type ExchangeList = {
  exchanges: ExchangeStatus[];
  credentials: { exchange: string; label: string; createdAt: string }[];
};

export type Stats = {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  openPositions: number;
  alertsToday: number;
};

// ── Chart & Signals / Gains test types ──────────────────────────────────────

export type SignalResult = {
  accepted: boolean;
  reason?: string;
  simulated?: boolean;
};

export type GainsStatus = {
  configured: boolean;
  chain: string;
  isDemoChain: boolean;
  agentAddress: string | null;
};

export type GainsPosition = {
  id: string;
  market: string;
  side: "long" | "short";
  size: string;
  leverage: string;
  openPrice: string;
  status: string;
};

export type GainsTestResult = {
  accepted: boolean;
  chain: string;
  order: unknown;
  positions: GainsPosition[];
};
