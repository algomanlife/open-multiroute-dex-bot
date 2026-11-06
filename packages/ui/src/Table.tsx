import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Minimal table primitives with consistent dashboard styling. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="w-full min-w-[36rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-800/70">{children}</tbody>;
}

export function TR({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-slate-800/40">{children}</tr>;
}

export function TH({
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className="px-4 py-3 font-medium" {...rest}>
      {children}
    </th>
  );
}

export function TD({
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className="px-4 py-3 text-slate-300 tabular-nums" {...rest}>
      {children}
    </td>
  );
}
