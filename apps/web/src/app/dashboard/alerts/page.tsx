"use client";

import { AlertLogTable } from "@/components/AlertLogTable";

export default function AlertsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Alert Log</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every TradingView webhook received, with routing outcome.
        </p>
      </div>
      <AlertLogTable />
    </div>
  );
}
