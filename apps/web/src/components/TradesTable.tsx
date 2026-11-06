"use client";

import { useQuery } from "@tanstack/react-query";
import { Table, THead, TBody, TR, TH, TD, EmptyState, StatusBadge } from "@omdb/ui";
import { get, type Trade } from "@/lib/api";
import { formatNumber, formatUsd, formatDateTime } from "@/lib/format";

export function TradesTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: () => get<{ trades: Trade[] }>("/api/trades?limit=50")
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading trades…</p>;
  const trades = data?.trades ?? [];
  if (trades.length === 0) {
    return (
      <EmptyState
        title="No trades yet"
        description="Executed orders from routed alerts will be listed here."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Time</TH>
          <TH>Exchange</TH>
          <TH>Market</TH>
          <TH>Side</TH>
          <TH>Size</TH>
          <TH>Price</TH>
          <TH>Strategy</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {trades.map((trade) => (
          <TR key={trade.id}>
            <TD>{formatDateTime(trade.createdAt)}</TD>
            <TD className="capitalize">{trade.exchange}</TD>
            <TD className="font-medium text-slate-100">{trade.market}</TD>
            <TD>
              <StatusBadge
                label={trade.side}
                tone={trade.side === "BUY" ? "success" : "danger"}
              />
            </TD>
            <TD>{formatNumber(trade.size)}</TD>
            <TD>{formatUsd(trade.price)}</TD>
            <TD>{trade.strategy}</TD>
            <TD>
              <StatusBadge label={trade.status} tone="info" />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
