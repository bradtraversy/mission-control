"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Session, SessionSource } from "@/lib/types";

type Props = {
  sessions: Session[];
};

const SOURCE_FILTERS: ("all" | SessionSource)[] = [
  "all",
  "claude-code",
  "openclaw",
];

const SOURCE_LABEL: Record<"all" | SessionSource, string> = {
  all: "All",
  "claude-code": "Claude Code",
  openclaw: "Travis",
};

const SOURCE_STYLE: Record<SessionSource, string> = {
  "claude-code": "bg-emerald-400/15 text-emerald-300",
  openclaw: "bg-accent/15 text-accent",
};

function filenameFromPath(relativePath: string): string {
  const last = relativePath.split("/").pop() ?? "";
  return last.replace(/\.md$/, "");
}

export function SessionsList({ sessions }: Props) {
  const [filter, setFilter] = useState<"all" | SessionSource>("all");

  const filtered = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((s) => s.source === filter)),
    [sessions, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {SOURCE_FILTERS.map((key) => (
          <Chip
            key={key}
            label={SOURCE_LABEL[key]}
            active={filter === key}
            onClick={() => setFilter(key)}
          />
        ))}
        <span className="text-[11px] text-muted ml-2">
          {filtered.length} {filtered.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-[12px] text-muted py-8 text-center border border-dashed border-border rounded-md">
          No sessions match this filter.
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-md bg-surface/40">
          {filtered.map((s) => {
            const filename = filenameFromPath(s.relativePath);
            const href = `/sessions/${s.source}/${encodeURIComponent(filename)}`;
            const projects = s.frontmatter.projects ?? [];
            return (
              <li key={`${s.source}/${filename}`}>
                <Link
                  href={href}
                  className="block px-4 py-3 hover:bg-surface transition-colors"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${SOURCE_STYLE[s.source]}`}
                    >
                      {SOURCE_LABEL[s.source]}
                    </span>
                    <span className="text-[11px] text-muted font-mono shrink-0">
                      {s.date ?? "—"}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {s.title}
                    </span>
                    {projects.length > 0 && (
                      <span className="flex items-center gap-1 ml-auto shrink-0">
                        {projects.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            className="text-[10px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2"
                          >
                            {p}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  {s.frontmatter.outcome && (
                    <p className="mt-1 text-[12px] text-muted line-clamp-2">
                      {s.frontmatter.outcome}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
        active
          ? "bg-accent/15 border-accent/40 text-foreground"
          : "bg-surface border-border text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
