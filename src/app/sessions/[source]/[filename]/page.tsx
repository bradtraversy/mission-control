import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { buildObsidianUri, readMarkdown } from "@/lib";
import type { SessionFrontmatter, SessionSource } from "@/lib/types";

const SOURCE_DIR: Record<SessionSource, string> = {
  claude: "Core/Sessions/Claude",
  openclaw: "Core/Sessions/OpenClaw",
};

const SOURCE_LABEL: Record<SessionSource, string> = {
  claude: "Claude",
  openclaw: "Travis",
};

const SOURCE_STYLE: Record<SessionSource, string> = {
  claude: "bg-emerald-400/15 text-emerald-300",
  openclaw: "bg-accent/15 text-accent",
};

function isSource(value: string): value is SessionSource {
  return value === "claude" || value === "openclaw";
}

function isSafeFilename(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

export default async function Page({
  params,
}: {
  params: Promise<{ source: string; filename: string }>;
}) {
  const { source, filename: rawFilename } = await params;
  if (!isSource(source)) notFound();

  const filename = decodeURIComponent(rawFilename);
  if (!isSafeFilename(filename)) notFound();

  const relativePath = `${SOURCE_DIR[source]}/${filename}.md`;

  let doc;
  try {
    doc = await readMarkdown<SessionFrontmatter>(relativePath);
  } catch {
    notFound();
  }

  const { frontmatter, body } = doc;
  const projects = frontmatter.projects ?? [];
  const topics = frontmatter.topics ?? [];
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] ?? null;
  const obsidianUri = buildObsidianUri(relativePath);

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Link
        href="/sessions"
        className="text-[11px] text-muted hover:text-foreground"
      >
        ← Back to sessions
      </Link>

      <header className="space-y-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${SOURCE_STYLE[source]}`}
          >
            {SOURCE_LABEL[source]}
          </span>
          {date && (
            <span className="text-[11px] text-muted font-mono">
              {date}
              {frontmatter.time ? ` · ${frontmatter.time}` : ""}
            </span>
          )}
          {frontmatter.tool && (
            <span className="text-[10px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2">
              {frontmatter.tool}
            </span>
          )}
          <a
            href={obsidianUri}
            className="ml-auto text-[11px] text-muted hover:text-foreground"
          >
            Edit in Obsidian ↗
          </a>
        </div>

        {frontmatter.outcome && (
          <p className="text-[13px] text-foreground/90 leading-relaxed">
            {frontmatter.outcome}
          </p>
        )}

        {(projects.length > 0 || topics.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {projects.map((p) => (
              <span
                key={`p-${p}`}
                className="text-[10px] text-accent px-1.5 py-0.5 rounded bg-accent/10"
              >
                {p}
              </span>
            ))}
            {topics.map((t) => (
              <span
                key={`t-${t}`}
                className="text-[10px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </header>

      <MarkdownBody content={body} />
    </div>
  );
}
