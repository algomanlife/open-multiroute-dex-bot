"use client";

import { useQuery } from "@tanstack/react-query";
import { Table, THead, TBody, TR, TH, TD, EmptyState, StatusBadge } from "@omdb/ui";
import { get, type Position } from "@/lib/api";
import { formatNumber, formatUsd, formatDateTime } from "@/lib/format";

export function PositionsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: () => get<{ positions: Position[] }>("/api/positions")
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading positions…</p>;
  const positions = data?.positions ?? [];
  if (positions.length === 0) {
    return (
      <EmptyState
        title="No open positions"
        description="Positions appear here once a routed alert opens one on a DEX."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Exchange</TH>
          <TH>Market</TH>
          <TH>Side</TH>
          <TH>Size</TH>
          <TH>Entry Price</TH>
          <TH>Strategy</TH>
          <TH>Opened</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {positions.map((position) => (
          <TR key={position.id}>
            <TD className="capitalize">{position.exchange}</TD>
            <TD className="font-medium text-slate-100">{position.market}</TD>
            <TD>
              <StatusBadge
                label={position.side}
                tone={position.side === "LONG" ? "success" : "danger"}
              />
            </TD>
            <TD>{formatNumber(position.size)}</TD>
            <TD>{formatUsd(position.entryPrice)}</TD>
            <TD>{position.strategy ?? "—"}</TD>
            <TD>{formatDateTime(position.openedAt)}</TD>
            <TD>
              <StatusBadge label={position.status} tone="info" />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
