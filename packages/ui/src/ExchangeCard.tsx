import type { ReactNode } from "react";
import { StatusBadge } from "./StatusBadge";

export type ExchangeCardProps = {
  exchange: string;
  ready: boolean;
  hasStoredCredential?: boolean;
  labels?: string[];
  actions?: ReactNode;
};

/** Card summarizing one DEX connection. */
export function ExchangeCard({
  exchange,
  ready,
  hasStoredCredential = false,
  labels = [],
  actions
}: ExchangeCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold capitalize text-slate-100">
          {exchange}
        </h3>
        <StatusBadge
          label={ready ? "Ready" : "Not configured"}
          tone={ready ? "success" : "muted"}
        />
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {hasStoredCredential
          ? `Credentials stored (${labels.join(", ") || "default"})`
          : "No stored credentials"}
      </p>
      {actions ? <div className="mt-4">{actions}</div> : null}
    </div>
  );
}
