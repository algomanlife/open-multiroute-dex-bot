"use client";

import dynamic from "next/dynamic";
import { KpiGrid } from "@/components/KpiGrid";
import { AlertLogTable } from "@/components/AlertLogTable";

const TradesChart = dynamic(
  () => import("@/components/TradesChart").then((mod) => mod.TradesChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
    )
  }
);

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live routing status, P&L and alert activity.
        </p>
      </div>
      <KpiGrid />
      <section aria-label="Cumulative P&L">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Cumulative P&L</h2>
        <TradesChart />
      </section>
      <section aria-label="Recent alerts">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Recent Alerts</h2>
        <AlertLogTable />
      </section>
    </div>
  );
}
