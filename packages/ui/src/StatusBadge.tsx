export type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "danger" | "muted" | "info";
};

const TONES: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  muted: "bg-slate-500/10 text-slate-400 border-slate-500/30"
};

/** Small pill badge for status values. */
export function StatusBadge({ label, tone = "muted" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {label}
    </span>
  );
}
