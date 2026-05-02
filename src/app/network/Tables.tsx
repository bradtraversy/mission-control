"use client";

import { useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import type {
  NetworkAutomation,
  NetworkGhost,
  NetworkOrphan,
} from "@/lib/parsers/network";

const LIGHT_STYLE: Record<NetworkAutomation["trafficLight"], string> = {
  green: "bg-emerald-400/20 text-emerald-300",
  yellow: "bg-amber-400/20 text-amber-300",
  red: "bg-rose-400/25 text-rose-300",
  unknown: "bg-surface-2 text-muted",
};

const OWNER_STYLE: Record<string, string> = {
  claude: "bg-slate-400/15 text-slate-300",
  cowork: "bg-orange-400/15 text-orange-300",
  travis: "bg-accent/15 text-accent",
  brad: "bg-emerald-400/15 text-emerald-300",
  system: "bg-surface-2 text-muted",
};

const OWNER_TOOLTIP: Record<string, string> = {
  claude: "Ask Claude Code directly. Edits vault skill files + re-registers.",
  cowork:
    "Ask Cowork (desktop Claude) directly. Same scheduled-tasks MCP capabilities as Claude Code.",
  travis:
    "Ask Travis in OpenClaw, or queue a Tasks/<date>-<slug>.md with agent: travis.",
  brad: "Brad owns the source script/service — systemd timers, personal crons, account-level stuff.",
  system: "Ubuntu/Debian default — don't touch unless something specific breaks.",
};

const TRAFFIC_LIGHT_RANK: Record<NetworkAutomation["trafficLight"], number> = {
  red: 3,
  yellow: 2,
  unknown: 1,
  green: 0,
};

type SortDir = "asc" | "desc";

function formatIso(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatRelativeTime(date);
}

function automationStatusLabel(a: NetworkAutomation): string {
  if (a.stale && (a.lastStatus === "ok" || a.lastStatus === null)) {
    return "stale";
  }
  return a.lastStatus ?? a.trafficLight;
}

// Generic comparator: nulls/undefined sort last regardless of direction.
function compare(a: unknown, b: unknown, dir: SortDir): number {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    cmp = (a ? 1 : 0) - (b ? 1 : 0);
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { numeric: true });
  }
  return dir === "asc" ? cmp : -cmp;
}

function dateValue(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const arrow = active ? (dir === "asc" ? "↑" : "↓") : "";
  return (
    <th className={`py-2 pr-3 font-medium ${className ?? ""}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase tracking-wider text-[12px] ${
          active ? "text-foreground" : "text-muted/60 hover:text-muted"
        }`}
      >
        <span>{label}</span>
        <span className="w-2 text-[10px]">{arrow}</span>
      </button>
    </th>
  );
}

function useSort<K extends string>(initialKey: K, initialDir: SortDir = "asc") {
  const [key, setKey] = useState<K>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const onClick = (next: K) => {
    if (next === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setKey(next);
      setDir("asc");
    }
  };
  return { key, dir, onClick };
}

export function AutomationsTable({ rows }: { rows: NetworkAutomation[] }) {
  type Col =
    | "status"
    | "name"
    | "owner"
    | "host"
    | "schedule"
    | "lastRun"
    | "detail";
  const sort = useSort<Col>("status", "desc");

  const sorted = useMemo(() => {
    const getter: Record<Col, (a: NetworkAutomation) => unknown> = {
      status: (a) => TRAFFIC_LIGHT_RANK[a.trafficLight],
      name: (a) => a.name,
      owner: (a) => a.owner,
      host: (a) => a.host,
      schedule: (a) => a.scheduleHuman,
      lastRun: (a) => dateValue(a.lastRun),
      detail: (a) => a.detail,
    };
    const get = getter[sort.key];
    return [...rows].sort((a, b) => compare(get(a), get(b), sort.dir));
  }, [rows, sort.key, sort.dir]);

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
          <tr className="text-left border-b border-border">
            <SortHeader
              label="Status"
              active={sort.key === "status"}
              dir={sort.dir}
              onClick={() => sort.onClick("status")}
            />
            <SortHeader
              label="Name"
              active={sort.key === "name"}
              dir={sort.dir}
              onClick={() => sort.onClick("name")}
            />
            <SortHeader
              label="Owner"
              active={sort.key === "owner"}
              dir={sort.dir}
              onClick={() => sort.onClick("owner")}
            />
            <SortHeader
              label="Host"
              active={sort.key === "host"}
              dir={sort.dir}
              onClick={() => sort.onClick("host")}
            />
            <SortHeader
              label="Schedule"
              active={sort.key === "schedule"}
              dir={sort.dir}
              onClick={() => sort.onClick("schedule")}
            />
            <SortHeader
              label="Last Run"
              active={sort.key === "lastRun"}
              dir={sort.dir}
              onClick={() => sort.onClick("lastRun")}
            />
            <SortHeader
              label="Detail"
              active={sort.key === "detail"}
              dir={sort.dir}
              onClick={() => sort.onClick("detail")}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.id} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3">
                <span
                  className={`text-[12px] px-1.5 py-0.5 rounded ${LIGHT_STYLE[a.trafficLight]}`}
                >
                  {automationStatusLabel(a)}
                </span>
              </td>
              <td className="py-2 pr-3 text-foreground">{a.name}</td>
              <td className="py-2 pr-3">
                {a.owner ? (
                  <span
                    title={OWNER_TOOLTIP[a.owner] ?? ""}
                    className={`text-[12px] px-1.5 py-0.5 rounded font-mono ${OWNER_STYLE[a.owner] ?? "bg-surface-2 text-muted"}`}
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

export function OrphansTable({ rows }: { rows: NetworkOrphan[] }) {
  type Col = "taskId" | "schedule" | "enabled" | "lastRun" | "description";
  const sort = useSort<Col>("taskId", "asc");

  const sorted = useMemo(() => {
    const getter: Record<Col, (o: NetworkOrphan) => unknown> = {
      taskId: (o) => o.taskId,
      schedule: (o) => o.scheduleHuman,
      enabled: (o) => o.enabled,
      lastRun: (o) => dateValue(o.lastRun),
      description: (o) => o.description,
    };
    const get = getter[sort.key];
    return [...rows].sort((a, b) => compare(get(a), get(b), sort.dir));
  }, [rows, sort.key, sort.dir]);

  return (
    <div className="overflow-x-auto">
      <div className="text-[12px] uppercase tracking-wider text-muted/60 mb-1">
        Orphans · live MCP, no registry entry
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left border-b border-border">
            <SortHeader
              label="Task ID"
              active={sort.key === "taskId"}
              dir={sort.dir}
              onClick={() => sort.onClick("taskId")}
            />
            <SortHeader
              label="Schedule"
              active={sort.key === "schedule"}
              dir={sort.dir}
              onClick={() => sort.onClick("schedule")}
            />
            <SortHeader
              label="Enabled"
              active={sort.key === "enabled"}
              dir={sort.dir}
              onClick={() => sort.onClick("enabled")}
            />
            <SortHeader
              label="Last Run"
              active={sort.key === "lastRun"}
              dir={sort.dir}
              onClick={() => sort.onClick("lastRun")}
            />
            <SortHeader
              label="Description"
              active={sort.key === "description"}
              dir={sort.dir}
              onClick={() => sort.onClick("description")}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => (
            <tr
              key={o.taskId}
              className="border-b border-border/40 last:border-0"
            >
              <td className="py-2 pr-3 text-foreground font-mono text-[13px]">
                {o.taskId}
              </td>
              <td className="py-2 pr-3 text-muted">
                {o.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`text-[12px] px-1.5 py-0.5 rounded ${
                    o.enabled
                      ? "bg-amber-400/20 text-amber-300"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {o.enabled ? "yes" : "no"}
                </span>
              </td>
              <td className="py-2 pr-3 text-muted">{formatIso(o.lastRun)}</td>
              <td className="py-2 pr-3 text-muted/80 max-w-[40ch] truncate">
                {o.description ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GhostsTable({ rows }: { rows: NetworkGhost[] }) {
  type Col = "registryId" | "owner" | "schedule" | "mcpTaskId";
  const sort = useSort<Col>("registryId", "asc");

  const sorted = useMemo(() => {
    const getter: Record<Col, (g: NetworkGhost) => unknown> = {
      registryId: (g) => g.registryId,
      owner: (g) => g.owner,
      schedule: (g) => g.scheduleHuman,
      mcpTaskId: (g) => g.mcpTaskId,
    };
    const get = getter[sort.key];
    return [...rows].sort((a, b) => compare(get(a), get(b), sort.dir));
  }, [rows, sort.key, sort.dir]);

  return (
    <div className="overflow-x-auto">
      <div className="text-[12px] uppercase tracking-wider text-muted/60 mb-1">
        Ghosts · registry entry, no live MCP task
      </div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left border-b border-border">
            <SortHeader
              label="Registry ID"
              active={sort.key === "registryId"}
              dir={sort.dir}
              onClick={() => sort.onClick("registryId")}
            />
            <SortHeader
              label="Owner"
              active={sort.key === "owner"}
              dir={sort.dir}
              onClick={() => sort.onClick("owner")}
            />
            <SortHeader
              label="Schedule"
              active={sort.key === "schedule"}
              dir={sort.dir}
              onClick={() => sort.onClick("schedule")}
            />
            <SortHeader
              label="MCP Task ID"
              active={sort.key === "mcpTaskId"}
              dir={sort.dir}
              onClick={() => sort.onClick("mcpTaskId")}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => (
            <tr
              key={g.registryId}
              className="border-b border-border/40 last:border-0"
            >
              <td className="py-2 pr-3 text-foreground font-mono text-[13px]">
                {g.registryId}
              </td>
              <td className="py-2 pr-3">
                {g.owner ? (
                  <span
                    className={`text-[12px] px-1.5 py-0.5 rounded font-mono ${OWNER_STYLE[g.owner] ?? "bg-surface-2 text-muted"}`}
                  >
                    {g.owner}
                  </span>
                ) : (
                  <span className="text-[12px] text-muted/60">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-muted">
                {g.scheduleHuman ?? "—"}
              </td>
              <td className="py-2 pr-3 text-muted font-mono text-[13px]">
                {g.mcpTaskId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
