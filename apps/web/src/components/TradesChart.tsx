"use client";

/** Cumulative P&L line chart (lazy-loaded client component). */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { get, type Trade } from "@/lib/api";

export function TradesChart() {
  const { data } = useQuery({
    queryKey: ["trades"],
    queryFn: () => get<{ trades: Trade[] }>("/api/trades?limit=200")
  });

  const series = useMemo(() => {
    const trades = [...(data?.trades ?? [])].reverse();
    let cumulative = 0;
    return trades
      .filter((trade) => trade.pnl !== null)
      .map((trade) => {
        cumulative += trade.pnl ?? 0;
        return {
          time: new Date(trade.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          pnl: Number(cumulative.toFixed(2))
        };
      });
  }, [data]);

  if (series.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
        P&L chart appears once closed trades with realized P&L exist.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" aria-label="Cumulative P&L chart">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} width={64} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#e2e8f0"
            }}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            name="Cumulative P&L"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TradesChart;
