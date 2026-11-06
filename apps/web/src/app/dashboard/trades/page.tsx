"use client";

import dynamic from "next/dynamic";
import { TradesTable } from "@/components/TradesTable";

const TradesChart = dynamic(
  () => import("@/components/TradesChart").then((mod) => mod.TradesChart),
  { ssr: false }
);

export default function TradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Trade History</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every order filled through the routing engine.
        </p>
      </div>
      <TradesChart />
      <TradesTable />
    </div>
  );
}
