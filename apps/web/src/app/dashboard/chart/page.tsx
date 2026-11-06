"use client";

/**
 * Chart & Signals: a Vela chart embedded in the dashboard whose script
 * alerts route to the configured exchange, a price-crossing watcher, and the
 * Gains demo test panel.
 */
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChartWorkspace } from "@/components/chart/ChartWorkspace";
import { SignalPanel } from "@/components/chart/SignalPanel";
import { GainsTestPanel } from "@/components/chart/GainsTestPanel";
import type {
  ChartAlertEvent,
  ChartBarEvent,
  FeedEntry,
  PriceWatcher,
  SignalConfig
} from "@/components/chart/chartTypes";
import { post, type SignalResult } from "@/lib/api";

const Chart = dynamic(
  () =>
    import("@/components/chart/ChartWorkspace").then(
      (mod) => mod.ChartWorkspace
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
    )
  }
);

const SYMBOL = "BTCUSDT";
const BASE = SYMBOL.replace("USDT", "");

export default function ChartSignalsPage() {
  const [config, setConfig] = useState<SignalConfig>({
    exchange: "gains",
    strategy: "vela-chart",
    size: 0.01,
    autoRouteJsonAlerts: true
  });
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [watchers, setWatchers] = useState<PriceWatcher[]>([]);
  const feedId = useRef(0);
  const configRef = useRef(config);
  configRef.current = config;
  const watchersRef = useRef(watchers);
  watchersRef.current = watchers;

  function pushFeed(entry: Omit<FeedEntry, "id" | "time">): void {
    feedId.current += 1;
    setFeed((items) =>
      [
        { ...entry, id: feedId.current, time: new Date().toLocaleTimeString("en-US") },
        ...items
      ].slice(0, 40)
    );
  }

  async function routeSignal(payload: {
    exchange: string;
    strategy: string;
    market: string;
    order: "buy" | "sell";
    price: number;
    position: "long" | "short" | "flat";
    reverse: boolean;
    size?: number;
    source: string;
  }): Promise<void> {
    pushFeed({
      source: payload.source,
      text: `${payload.order} ${payload.size ?? ""} ${payload.market} → ${payload.exchange}`,
      tone: "info"
    });
    try {
      const result = await post<SignalResult>("/api/signals", {
        exchange: payload.exchange,
        strategy: payload.strategy,
        market: payload.market,
        order: payload.order,
        price: payload.price,
        position: payload.position,
        reverse: payload.reverse,
        size: payload.size
      });
      pushFeed({
        source: "engine",
        text: result.accepted
          ? `Routed to ${payload.exchange}`
          : `Rejected: ${result.reason}`,
        tone: result.accepted ? "ok" : "err"
      });
    } catch (error) {
      pushFeed({
        source: "engine",
        text: error instanceof Error ? error.message : "request failed",
        tone: "err"
      });
    }
  }

  /** Vela script alert → JSON signal (TradingView-compatible). */
  async function handleAlert(alert: ChartAlertEvent): Promise<void> {
    pushFeed({
      source: `vela${alert.indicator ? ` · ${alert.indicator}` : ""}`,
      text: alert.message,
      tone: "info"
    });
    const current = configRef.current;
    if (!current.autoRouteJsonAlerts) return;
    try {
      const parsed = JSON.parse(alert.message) as Record<string, unknown>;
      if (
        (parsed.order === "buy" || parsed.order === "sell") &&
        typeof parsed.position === "string" &&
        typeof parsed.strategy === "string"
      ) {
        await routeSignal({
          exchange:
            typeof parsed.exchange === "string" ? parsed.exchange : current.exchange,
          strategy: String(parsed.strategy),
          market: typeof parsed.market === "string" ? parsed.market : BASE,
          order: parsed.order,
          price: Number(parsed.price ?? 0),
          position: parsed.position as "long" | "short" | "flat",
          reverse: Boolean(parsed.reverse),
          size: Number(parsed.size ?? current.size),
          source: "vela-json"
        });
      }
    } catch {
      // free-text alert → feed only
    }
  }

  /** Live bar: check one-shot price watchers. */
  function handleBar(bar: ChartBarEvent): void {
    const active = watchersRef.current;
    if (active.length === 0) return;
    const current = configRef.current;
    for (const watcher of active) {
      const hit =
        watcher.direction === "above"
          ? bar.close >= watcher.price
          : bar.close <= watcher.price;
      if (!hit) continue;
      setWatchers((items) => items.filter((item) => item !== watcher));
      const order: "buy" | "sell" =
        watcher.direction === "above" ? "buy" : "sell";
      void routeSignal({
        exchange: current.exchange,
        strategy: current.strategy,
        market: BASE,
        order,
        price: bar.close,
        position: order === "buy" ? "long" : "short",
        reverse: false,
        size: current.size,
        source: `watcher@${watcher.price}`
      });
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-100">Chart &amp; Signals</h1>
        <p className="mt-1 text-sm text-slate-400">
          Vela chart embedded in the dashboard — script alerts and price levels
          route straight to the exchange through the engine.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Chart
            symbol={SYMBOL}
            onAlert={(alert) => void handleAlert(alert)}
            onBar={handleBar}
            onReady={() => undefined}
          />
          <GainsTestPanel />
        </div>
        <SignalPanel
          config={config}
          onConfigChange={(patch) => setConfig((value) => ({ ...value, ...patch }))}
          onManual={(side) =>
            void routeSignal({
              exchange: config.exchange,
              strategy: config.strategy,
              market: BASE,
              order: side,
              price: 0,
              position: side === "buy" ? "long" : "short",
              reverse: false,
              size: config.size,
              source: "manual"
            })
          }
          onPriceLevelAdd={(price, direction) =>
            setWatchers((items) => [...items, { price, direction }])
          }
          feed={feed}
          watchers={watchers}
        />
      </div>
    </div>
  );
}
