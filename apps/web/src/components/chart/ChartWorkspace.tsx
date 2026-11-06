"use client";

/**
 * Vela Charts workspace embedded in the dashboard.
 *
 * Wires the chart's script alerts to the routing engine: any Vela alert whose
 * message parses as a JSON signal is forwarded to /api/signals (which routes
 * it to the configured exchange exactly like a TradingView webhook).
 */
import { useEffect, useRef } from "react";
import type { VelaWorkspace as VelaWorkspaceType } from "@luxalgo/vela/workspace";

export type SignalPayload = {
  exchange: string;
  strategy: string;
  market: string;
  order: "buy" | "sell";
  price: number;
  position: "long" | "short" | "flat";
  reverse: boolean;
  size?: number;
  sizeUsd?: number;
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

type Props = {
  symbol: string;
  onAlert: (alert: ChartAlertEvent) => void;
  onBar: (bar: ChartBarEvent) => void;
  onReady: (workspace: VelaWorkspaceType | null) => void;
};

export function ChartWorkspace({ symbol, onAlert, onBar, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<VelaWorkspaceType | null>(null);
  const handlersRef = useRef({ onAlert, onBar });
  handlersRef.current = { onAlert, onBar };

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void)[] = [];

    async function boot(): Promise<void> {
      const { VelaWorkspace } = await import("@luxalgo/vela/workspace");
      const { BinanceProvider } = await import(
        "@luxalgo/vela/providers/binance"
      );
      if (disposed || !containerRef.current) return;

      const workspace = new VelaWorkspace(containerRef.current, {
        layout: false,
        symbol,
        timeframe: "15",
        live: true,
        theme: "dark",
        persist: true,
        providers: { binance: () => new BinanceProvider() }
      });
      workspaceRef.current = workspace as unknown as VelaWorkspaceType;

      /** Attach chart-level listeners to a cell's chart. */
      const attach = (chart: unknown): void => {
        const target = chart as {
          on: (
            event: string,
            handler: (payload: unknown) => void
          ) => () => void;
        } | null;
        if (!target) return;
        unsubscribe.push(
          target.on("alert", (payload) => {
            handlersRef.current.onAlert(payload as ChartAlertEvent);
          })
        );
        unsubscribe.push(
          target.on("bar", (payload) => {
            handlersRef.current.onBar(payload as ChartBarEvent);
          })
        );
      };

      const ws = workspace as unknown as {
        cell: (id: string) => { chart: unknown } | undefined;
        activeCellId: string;
        on: (
          event: string,
          handler: (payload: unknown) => void
        ) => () => void;
        destroy?: () => void;
      };
      const attachActive = (): void => {
        const cell = ws.cell(ws.activeCellId);
        if (cell) attach(cell.chart);
      };

      // Cells boot asynchronously — attach on the first active-cell report and
      // re-attach when focus moves to another cell.
      unsubscribe.push(
        ws.on("cell:active", () => {
          unsubscribe.forEach((off) => off());
          unsubscribe = [];
          attachActive();
        })
      );
      const timer = setTimeout(attachActive, 1500);

      onReady(workspace);
      cleanup = () => {
        clearTimeout(timer);
        unsubscribe.forEach((off) => off());
        unsubscribe = [];
        ws.destroy?.();
      };
    }

    let cleanup: (() => void) | null = null;
    void boot();
    return () => {
      disposed = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-[520px] w-full rounded-xl border border-slate-800 overflow-hidden" />;
}
