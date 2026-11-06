"use client";

import { PositionsTable } from "@/components/PositionsTable";

export default function PositionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Open Positions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live per-market positions opened by routed alerts.
        </p>
      </div>
      <PositionsTable />
    </div>
  );
}
