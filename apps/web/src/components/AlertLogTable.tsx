"use client";

import { useQuery } from "@tanstack/react-query";
import { Table, THead, TBody, TR, TH, TD, EmptyState, StatusBadge } from "@omdb/ui";
import { get, type Alert } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function AlertLogTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => get<{ alerts: Alert[] }>("/api/alerts?limit=100")
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading alerts…</p>;
  const alerts = data?.alerts ?? [];
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts received"
        description="Point your TradingView webhook at /api/webhook to start logging."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Time</TH>
          <TH>Exchange</TH>
          <TH>Strategy</TH>
          <TH>Result</TH>
          <TH>Reason</TH>
        </TR>
      </THead>
      <TBody>
        {alerts.map((alert) => (
          <TR key={alert.id}>
            <TD>{formatDateTime(alert.createdAt)}</TD>
            <TD className="capitalize">{alert.exchange}</TD>
            <TD>{alert.strategy}</TD>
            <TD>
              <StatusBadge
                label={alert.accepted ? "Routed" : "Rejected"}
                tone={alert.accepted ? "success" : "danger"}
              />
            </TD>
            <TD className="text-slate-500">{alert.reason ?? "—"}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
