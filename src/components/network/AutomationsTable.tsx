"use client";

import { useMemo, useState } from "react";
import type { NetworkAutomation } from "@/lib";

type Props = {
  rows: NetworkAutomation[];
  lightStyle: Record<NetworkAutomation["trafficLight"], string>;
  ownerStyle: Record<string, string>;
  ownerTooltip: Record<string, string>;
  formatIso: (value: string | null) => string;
  statusLabel: (a: NetworkAutomation) => string;
};

type SortColumn =
  | "status"
  | "name"
  | "owner"
  | "host"
  | "schedule"
  | "lastRun"
  | "detail";
type SortDirection = "asc" | "desc";
type SortState = { column: SortColumn; direction: SortDirection } | null;

const LIGHT_RANK: Record<NetworkAutomation["trafficLight"], number> = {
  red: 0,
  yellow: 1,
  unknown: 2,
  green: 3,
};

function compareNullable(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.localeCompare(b);
}

function sortRows(
  rows: NetworkAutomation[],
  sort: SortState,
): NetworkAutomation[] {
  if (!sort) return rows;
  const { column, direction } = sort;
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (column) {
      case "status":
        cmp = LIGHT_RANK[a.trafficLight] - LIGHT_RANK[b.trafficLight];
        break;
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "owner":
        cmp = compareNullable(a.owner ?? null, b.owner ?? null);
        break;
      case "host":
        cmp = compareNullable(a.host ?? null, b.host ?? null);
        break;
      case "schedule":
        cmp = compareNullable(a.scheduleHuman ?? null, b.scheduleHuman ?? null);
        break;
      case "lastRun":
        // Newest first by default — use string compare on ISO timestamps.
        cmp = compareNullable(a.lastRun ?? null, b.lastRun ?? null);
        break;
      case "detail":
        cmp = compareNullable(a.detail ?? null, b.detail ?? null);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function AutomationsTable({
  rows,
  lightStyle,
  ownerStyle,
  ownerTooltip,
  formatIso,
  statusLabel,
}: Props) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);

  function handleHeaderClick(column: SortColumn) {
    setSort((prev) => {
      if (!prev || prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null; // third click → unsorted, return to source order
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-muted py-2">
        No automations reported in <code>automations-health.json</code>.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-wider text-muted/60 border-b border-border">
            <SortHeader
              column="status"
              label="Status"
              sort={sort}
              onClick={handleHeaderClick}
            />
            <SortHeader
              column="name"
              label="Name"
              sort={sort}
              onClick={handleHeaderClick}
            />
            <SortHeader
              column="owner"
              label="Owner"
              sort={sort}
              onClick={handleHeaderClick}
            />
            <SortHeader
              column="host"
              label="Host"
              sort={sort}
              onClick={handleHeaderClick}
            />
            <SortHeader
              column="schedule"
              label="Schedule"
              sort={sort}
              onClick={handleHeaderClick}
            />
            <SortHeader
              column="lastRun"
              label="Last Run"
              sort={sort}
              onClick={handleHeaderClick}
            />
            <SortHeader
              column="detail"
              label="Detail"
              sort={sort}
              onClick={handleHeaderClick}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.id} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3">
                <span
                  className={`text-[12px] px-1.5 py-0.5 rounded ${lightStyle[a.trafficLight]}`}
                >
                  {statusLabel(a)}
                </span>
              </td>
              <td className="py-2 pr-3 text-foreground">{a.name}</td>
              <td className="py-2 pr-3">
                {a.owner ? (
                  <span
                    title={ownerTooltip[a.owner] ?? ""}
                    className={`text-[12px] px-1.5 py-0.5 rounded font-mono ${ownerStyle[a.owner] ?? "bg-surface-2 text-muted"}`}
                  >
                    {a.owner}
                  </span>
                ) : (
                  <span className="text-[12px] text-muted/60">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-muted font-mono">
                {a.host ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted">
                {a.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted">{formatIso(a.lastRun)}</td>
              <td className="py-2 pr-3 text-muted/80 max-w-[32ch] truncate">
                {a.detail ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  column,
  label,
  sort,
  onClick,
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  onClick: (c: SortColumn) => void;
}) {
  const active = sort?.column === column;
  const arrow = !active ? "" : sort.direction === "asc" ? " ↑" : " ↓";
  return (
    <th className="py-2 pr-3 font-medium">
      <button
        type="button"
        onClick={() => onClick(column)}
        className={`uppercase tracking-wider text-[12px] hover:text-foreground transition-colors ${active ? "text-foreground" : "text-muted/60"}`}
      >
        {label}
        {arrow}
      </button>
    </th>
  );
}
