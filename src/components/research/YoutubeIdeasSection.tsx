"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import type {
  YoutubeIdea,
  YoutubeIdeaFormat,
  YoutubeIdeaShelfLife,
  YoutubeIdeaStatus,
} from "@/lib";

type Props = {
  ideas: YoutubeIdea[];
  /** Map of relativePath → obsidian:// URI, pre-computed server-side. */
  obsidianUris: Record<string, string>;
};

type Filter = YoutubeIdeaStatus | "all";

const STATUS_ORDER: YoutubeIdeaStatus[] = [
  "idea",
  "consider",
  "shortlist",
  "dropped",
];

const STATUS_PILL: Record<YoutubeIdeaStatus, string> = {
  idea: "bg-surface-2 text-muted/80",
  consider: "bg-amber-400/15 text-amber-300",
  shortlist: "bg-emerald-400/15 text-emerald-300",
  dropped: "bg-rose-400/15 text-rose-300/70",
};

const FORMAT_PILL: Record<YoutubeIdeaFormat, string> = {
  reaction: "bg-rose-400/10 text-rose-300/80",
  tutorial: "bg-emerald-400/10 text-emerald-300/80",
  trend: "bg-sky-400/10 text-sky-300/80",
  review: "bg-violet-400/10 text-violet-300/80",
  "talking-head": "bg-amber-400/10 text-amber-300/80",
  unknown: "bg-surface-2 text-muted/60",
};

const SHELF_LIFE_PILL: Record<YoutubeIdeaShelfLife, string> = {
  hot: "text-rose-300",
  medium: "text-amber-300/80",
  evergreen: "text-emerald-300/80",
  unknown: "text-muted/60",
};

export function YoutubeIdeasSection({ ideas, obsidianUris }: Props) {
  const [filter, setFilter] = useState<Filter>("idea");
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: ideas.length,
      idea: 0,
      consider: 0,
      shortlist: 0,
      dropped: 0,
    };
    for (const i of ideas) c[i.status] += 1;
    return c;
  }, [ideas]);

  const visible = useMemo(
    () => (filter === "all" ? ideas : ideas.filter((i) => i.status === filter)),
    [filter, ideas],
  );

  return (
    <section className="space-y-3 max-w-none">
      <header className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
          YouTube Ideas · {ideas.length}
        </h2>
        <span className="text-[12px] text-muted/60">
          source: <code className="text-foreground/80">Research/YouTube/</code>
        </span>
      </header>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", ...STATUS_ORDER] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-[12px] px-2 py-1 rounded border font-mono transition-colors ${
              filter === f
                ? "bg-accent/15 border-accent/40 text-foreground"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
          >
            {f} <span className="text-muted/60">· {counts[f]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-[13px] text-muted/60 italic py-2">
          No ideas with status <code>{filter}</code>. Switch filters or wait
          for tomorrow&apos;s batch.
        </p>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((idea) => (
            <li key={idea.filename}>
              <IdeaCard
                idea={idea}
                obsidianUri={obsidianUris[idea.relativePath] ?? "#"}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function IdeaCard({
  idea,
  obsidianUri,
}: {
  idea: YoutubeIdea;
  obsidianUri: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<YoutubeIdeaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: YoutubeIdeaStatus) {
    if (next === idea.status) return;
    setPending(next);
    setError(null);
    try {
      const res = await fetch(`/api/youtube-ideas/${idea.filename}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "update failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="h-full bg-surface-2/60">
      <CardBody className="space-y-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[14px] font-medium text-foreground hover:text-accent text-left leading-snug min-w-0"
          >
            {idea.title}
          </button>
          <span
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${STATUS_PILL[idea.status]}`}
          >
            {idea.status}
          </span>
        </div>

        {idea.hook && !expanded && (
          <p className="text-[12px] text-muted leading-snug line-clamp-2">
            {idea.hook}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span
            className={`px-1.5 py-0.5 rounded font-mono ${FORMAT_PILL[idea.format]}`}
          >
            {idea.format}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-mono bg-surface-2 ${SHELF_LIFE_PILL[idea.shelfLife]}`}
          >
            {idea.shelfLife}
          </span>
          {idea.score && (
            <span className="px-1.5 py-0.5 rounded font-mono bg-surface-2 text-muted/70">
              score: {idea.score}
            </span>
          )}
          {idea.sourceDate && (
            <span className="text-muted/60 font-mono ml-auto">
              {idea.sourceDate}
            </span>
          )}
        </div>

        {expanded && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            {idea.hook && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted/60 mb-1">
                  Hook
                </div>
                <p className="text-[13px] text-foreground/90 leading-snug">
                  {idea.hook}
                </p>
              </div>
            )}
            {idea.whyItMatters && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted/60 mb-1">
                  Why it matters
                </div>
                <p className="text-[13px] text-muted leading-snug">
                  {idea.whyItMatters}
                </p>
              </div>
            )}
            {idea.sources.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted/60 mb-1">
                  Sources
                </div>
                <ul className="space-y-0.5">
                  {idea.sources.map((src, i) => (
                    <li key={i} className="text-[12px] text-muted/80 truncate">
                      <SourceLink src={src} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <details className="pt-1">
              <summary className="text-[10px] uppercase tracking-wider text-muted/60 cursor-pointer hover:text-foreground">
                Full body
              </summary>
              <div className="mt-2 text-[13px]">
                <MarkdownBody content={idea.body} />
              </div>
            </details>
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-border/40 flex-wrap">
          {STATUS_ORDER.filter((s) => s !== idea.status).map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending !== null}
              onClick={() => changeStatus(s)}
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors disabled:opacity-50 ${
                s === "dropped"
                  ? "text-rose-300/70 hover:bg-rose-400/15"
                  : s === "shortlist"
                    ? "text-emerald-300 hover:bg-emerald-400/15"
                    : s === "consider"
                      ? "text-amber-300 hover:bg-amber-400/15"
                      : "text-muted/70 hover:bg-surface-2"
              }`}
            >
              {pending === s ? "…" : `→ ${s}`}
            </button>
          ))}
          <a
            href={obsidianUri}
            className="text-[10px] uppercase tracking-wider text-muted/60 hover:text-foreground ml-auto"
          >
            Open ↗
          </a>
        </div>

        {error && (
          <p className="text-[11px] text-rose-300 truncate" title={error}>
            {error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function SourceLink({ src }: { src: string }) {
  // [[Research/Digests/2026-04-30]] → render as in-app link if possible.
  const wikiMatch = src.match(/^\[\[([^\]]+)\]\]$/);
  if (wikiMatch) {
    const target = wikiMatch[1];
    const digest = target.match(/Research\/Digests\/(\d{4}-\d{2}-\d{2})/);
    if (digest) {
      return (
        <a
          href={`/research?date=${digest[1]}`}
          className="text-accent hover:underline"
        >
          {target}
        </a>
      );
    }
    return <span>{target}</span>;
  }
  if (src.startsWith("http")) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:underline"
      >
        {src.replace(/^https?:\/\//, "").slice(0, 80)}
      </a>
    );
  }
  return <span>{src}</span>;
}
