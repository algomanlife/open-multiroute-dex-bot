"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardCard } from "@omdb/ui";
import { get, type Stats } from "@/lib/api";
import { formatPercent, formatUsd } from "@/lib/format";

export function KpiGrid() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: () => get<Stats>("/api/stats")
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-busy="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-rose-400" role="alert">
        Failed to load stats. Is the API server running?
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <DashboardCard title="Total Trades" value={data.totalTrades} />
      <DashboardCard title="Win Rate" value={formatPercent(data.winRate)} />
      <DashboardCard
        title="Total P&L"
        value={formatUsd(data.totalPnl)}
        delta={{
          value: data.totalPnl >= 0 ? "profit" : "loss",
          positive: data.totalPnl >= 0
        }}
      />
      <DashboardCard title="Open Positions" value={data.openPositions} />
      <DashboardCard title="Alerts (24h)" value={data.alertsToday} />
    </div>
  );
}
