"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ActivityEntry, ActivityKind } from "@/lib/activity";

const MAX_ENTRIES = 30;

const KIND_COLOR: Record<ActivityKind, string> = {
  task: "text-emerald-300",
  todo: "text-emerald-300",
  "session-claude": "text-emerald-300",
  "session-openclaw": "text-accent",
  sponsor: "text-amber-300",
  youtube: "text-rose-300",
  calendar: "text-sky-300",
  research: "text-sky-300",
  network: "text-muted",
  context: "text-muted",
  memory: "text-muted",
  other: "text-muted",
};

const KIND_DOT: Record<ActivityKind, string> = {
  task: "bg-emerald-400",
  todo: "bg-emerald-400",
  "session-claude": "bg-emerald-400",
  "session-openclaw": "bg-accent",
  sponsor: "bg-amber-400",
  youtube: "bg-rose-400",
  calendar: "bg-sky-400",
  research: "bg-sky-400",
  network: "bg-muted",
  context: "bg-muted",
  memory: "bg-muted",
  other: "bg-muted",
};

function formatRelative(at: number, now: number): string {
  const diffSec = Math.max(0, Math.round((now - at) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function LiveActivityRail() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events");
    sourceRef.current = source;

    source.addEventListener("open", () => setConnected(true));
    source.addEventListener("error", () => setConnected(false));

    source.addEventListener("activity", (ev) => {
      try {
        const { entries: incoming } = JSON.parse(
          (ev as MessageEvent).data,
        ) as { entries: ActivityEntry[] };
        if (!Array.isArray(incoming) || incoming.length === 0) return;
        setEntries((prev) => {
          const merged = [...incoming, ...prev];
          const seen = new Set<string>();
          const deduped: ActivityEntry[] = [];
          for (const e of merged) {
            if (seen.has(e.id)) continue;
            seen.add(e.id);
            deduped.push(e);
            if (deduped.length >= MAX_ENTRIES) break;
          }
          return deduped;
        });
      } catch (err) {
        console.error("LiveActivityRail: failed to parse activity event", err);
      }
    });

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  // Keep relative-time labels current without re-fetching anything.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-full p-4 overflow-y-auto border-l border-border">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[12px] font-medium tracking-[0.18em] uppercase text-muted">
          Live Activity
        </h2>
        <span
          className={`text-[10px] uppercase tracking-wider ${connected ? "text-emerald-300/70" : "text-muted/50"}`}
        >
          {connected ? "live" : "offline"}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-[13px] text-muted/60 leading-relaxed italic">
          Waiting for vault activity. Anything written to Tasks, Sessions,
          Sponsors, YouTube, or other vault folders will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <ActivityRow key={e.id} entry={e} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityRow({ entry, now }: { entry: ActivityEntry; now: number }) {
  const inner = (
    <div className="flex items-start gap-2 group">
      <span
        className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${KIND_DOT[entry.kind]}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0 leading-snug">
        <div
          className={`text-[13px] truncate ${KIND_COLOR[entry.kind]} group-hover:text-foreground transition-colors`}
          title={entry.path}
        >
          {entry.label}
        </div>
        <div className="text-[11px] text-muted/60 font-mono">
          {formatRelative(entry.at, now)}
        </div>
      </div>
    </div>
  );
  if (!entry.href) {
    return <li>{inner}</li>;
  }
  return (
    <li>
      <Link href={entry.href} className="block">
        {inner}
      </Link>
    </li>
  );
}
