import type { ReactNode } from "react";
import {
  formatRelativeTime,
  formatUsd,
  type AutomationHealth,
  type Digest,
  type ServiceHealth,
  type Session,
} from "@/lib";

type Props = {
  tasks: { queued: number; claimed: number; done: number };
  todosOpen: number;
  todosTotal: number;
  sponsorOutstanding: number;
  nextSponsorDue: string | null;
  serviceHealth: ServiceHealth;
  automationHealth: AutomationHealth;
  latestDigest: Digest | null;
  lastSession: Session | null;
};

export function StatTiles({
  tasks,
  todosOpen,
  todosTotal,
  sponsorOutstanding,
  nextSponsorDue,
  serviceHealth,
  automationHealth,
  latestDigest,
  lastSession,
}: Props) {
  const netTotal = serviceHealth.totalServices + automationHealth.total;
  const netHealthy = serviceHealth.activeServices + automationHealth.green;
  const netColor =
    automationHealth.red > 0
      ? "text-red-400"
      : automationHealth.yellow > 0
        ? "text-yellow-400"
        : "text-emerald-400";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Tile
        label="Tasks"
        value={
          <span className="tabular-nums">
            <span className="text-muted">Q:</span>
            {tasks.queued}
            <span className="text-muted mx-1.5">·</span>
            <span className="text-muted">C:</span>
            {tasks.claimed}
          </span>
        }
        sub={`${tasks.done} done`}
      />
      <Tile
        label="Todos Now"
        value={<span className="tabular-nums">{todosOpen} open</span>}
        sub={`of ${todosTotal}`}
      />
      <Tile
        label="Sponsor $"
        value={formatUsd(sponsorOutstanding)}
        sub={nextSponsorDue ? `next: ${nextSponsorDue}` : "outstanding"}
      />
      <Tile
        label="Network"
        value={
          <span className={netColor}>
            {netHealthy}/{netTotal} ok
          </span>
        }
        sub={`${automationHealth.yellow} warn · ${automationHealth.red} fail`}
      />
      <Tile
        label="Last Digest"
        value={latestDigest?.date ?? "—"}
        sub={
          latestDigest?.frontmatter.topics
            ? `${latestDigest.frontmatter.topics.length} topics`
            : undefined
        }
      />
      <Tile
        label="Last Session"
        value={lastSession ? formatRelativeTime(lastSession.mtime) : "—"}
        sub={lastSession ? `${lastSession.source} · ${lastSession.slug}` : undefined}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3 flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted">
        {label}
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted truncate">{sub}</span>}
    </div>
  );
}
