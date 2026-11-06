"use client";

import { ExchangeManager } from "@/components/ExchangeManager";

export default function ExchangesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-100">Exchanges</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect DEX accounts and store encrypted credentials.
        </p>
      </div>
      <ExchangeManager />
    </div>
  );
}
