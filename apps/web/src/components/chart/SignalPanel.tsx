"use client";

/**
 * Signal routing panel (presentational): configuration, manual trigger,
 * price watcher input and the signal feed. Logic lives in the chart page.
 */
import { useState } from "react";
import type { SignalConfig, FeedEntry } from "./chartTypes";

const EXCHANGES = [
  "gains",
  "hyperliquid",
  "dydxv4",
  "gmx",
  "perpetual",
  "bluefin"
] as const;

export function SignalPanel({
  config,
  onConfigChange,
  onManual,
  onPriceLevelAdd,
  feed,
  watchers
}: {
  config: SignalConfig;
  onConfigChange: (patch: Partial<SignalConfig>) => void;
  onManual: (side: "buy" | "sell") => void;
  onPriceLevelAdd: (price: number, direction: "above" | "below") => void;
  feed: FeedEntry[];
  watchers: { price: number; direction: "above" | "below" }[];
}) {
  const [priceLevel, setPriceLevel] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");

  function addPriceLevel(): void {
    const price = Number(priceLevel);
    if (!price) return;
    onPriceLevelAdd(price, direction);
    setPriceLevel("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-medium text-slate-200">Signal Routing</h3>
        <p className="mt-1 text-xs text-slate-500">
          Vela script alerts with JSON messages are routed to the exchange like
          TradingView webhooks (POST /api/signals → engine → DEX).
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            Exchange
            <select
              value={config.exchange}
              onChange={(event) => onConfigChange({ exchange: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              {EXCHANGES.map((exchange) => (
                <option key={exchange} value={exchange}>
                  {exchange}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Strategy
            <input
              value={config.strategy}
              onChange={(event) => onConfigChange({ strategy: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400">
            Size (base units)
            <input
              type="number"
              step="0.01"
              value={config.size}
              onChange={(event) =>
                onConfigChange({ size: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="flex items-end gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={config.autoRouteJsonAlerts}
              onChange={(event) =>
                onConfigChange({ autoRouteJsonAlerts: event.target.checked })
              }
              className="h-4 w-4 accent-cyan-500"
            />
            Auto-route JSON alerts
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onManual("buy")}
            className="rounded-lg bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Send BUY signal
          </button>
          <button
            type="button"
            onClick={() => onManual("sell")}
            className="rounded-lg bg-rose-500/90 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-rose-400"
          >
            Send SELL signal
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-medium text-slate-200">Price Watcher</h3>
        <p className="mt-1 text-xs text-slate-500">
          One-shot trigger: when the live close crosses the level, the signal is
          routed to the selected exchange.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-400">
            Price
            <input
              value={priceLevel}
              onChange={(event) => setPriceLevel(event.target.value)}
              placeholder="e.g. 65000"
              inputMode="decimal"
              className="mt-1 w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={addPriceLevel}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-700"
          >
            Watch {direction === "above" ? "↑ above" : "↓ below"}
          </button>
          <button
            type="button"
            onClick={() => setDirection(direction === "above" ? "below" : "above")}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Toggle direction
          </button>
        </div>
        {watchers.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {watchers.map((watcher, index) => (
              <li
                key={`${watcher.price}-${watcher.direction}-${index}`}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-300"
              >
                close {watcher.direction} {watcher.price}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-medium text-slate-200">Signal Feed</h3>
        <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-xs">
          {feed.length === 0 ? (
            <li className="text-slate-600">
              No signals yet — add a Vela script that calls alert(), watch a price
              level, or send manually.
            </li>
          ) : (
            feed.map((entry) => (
              <li
                key={entry.id}
                className={`flex gap-2 rounded-lg px-2 py-1.5 font-mono ${
                  entry.tone === "ok"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : entry.tone === "err"
                      ? "bg-rose-500/10 text-rose-400"
                      : "bg-slate-800/60 text-slate-300"
                }`}
              >
                <span className="text-slate-500">{entry.time}</span>
                <span className="text-slate-400">[{entry.source}]</span>
                <span className="min-w-0 break-all">{entry.text}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
