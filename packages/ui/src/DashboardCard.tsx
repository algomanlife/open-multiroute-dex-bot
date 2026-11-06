import type { ReactNode } from "react";

export type DashboardCardProps = {
  title: string;
  value: ReactNode;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
};

/** KPI card for dashboard overview metrics. */
export function DashboardCard({ title, value, delta, icon }: DashboardCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">
        {value}
      </p>
      {delta ? (
        <p
          className={
            delta.positive
              ? "mt-1 text-sm text-emerald-400"
              : "mt-1 text-sm text-rose-400"
          }
          aria-label={`${title} change ${delta.value}`}
        >
          {delta.positive ? "▲" : "▼"} {delta.value}
        </p>
      ) : null}
    </div>
  );
}
