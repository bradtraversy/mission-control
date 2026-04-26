import { listMarkdown } from "../vault";
import type { Session, SessionFrontmatter, SessionSource } from "../types";

const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})(?:-(.+))?\.md$/;
const HEADING_RE = /^#{1,3}\s+(.+?)\s*$/m;
const H2_RE = /^##\s+(.+?)\s*$/gm;
const TIME_PREFIX_RE = /^\d{1,2}:\d{2}\s*[—\-–:]\s*/;
const MAX_TOPICS = 3;

function cleanHeading(text: string, date: string | null): string {
  let result = text
    .replace(/^Session\s+/i, "")
    .replace(TIME_PREFIX_RE, "")
    .trim();
  if (date) result = result.replaceAll(date, "");
  return result.replace(/^[—\-–:\s]+|[—\-–:\s]+$/g, "").trim();
}

function deriveTitle(slug: string, body: string, date: string | null): string {
  if (!(date && slug === date)) {
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const heading = body.match(HEADING_RE)?.[1]?.trim();
  const cleaned = heading ? cleanHeading(heading, date) : "";
  if (cleaned) return cleaned;

  // Fallback: H1 was just the date (e.g. "# 2026-04-26"). Travis's daily logs
  // put per-session topics in H2s — join those instead of a generic placeholder.
  const topics: string[] = [];
  for (const match of body.matchAll(H2_RE)) {
    const topic = cleanHeading(match[1], date);
    if (topic) topics.push(topic);
  }
  if (topics.length === 0) return "Daily log";
  if (topics.length <= MAX_TOPICS) return topics.join(" · ");
  return `${topics.slice(0, MAX_TOPICS).join(" · ")} · +${topics.length - MAX_TOPICS} more`;
}

export async function getSessions(
  opts: { limit?: number; source?: SessionSource } = {},
): Promise<Session[]> {
  const sources: SessionSource[] = opts.source
    ? [opts.source]
    : ["claude-code", "openclaw"];

  const groups = await Promise.all(
    sources.map(async (src) => {
      const dir =
        src === "claude-code" ? "Core/Sessions/Claude" : "Core/Sessions/OpenClaw";
      const files = await listMarkdown(dir);
      return files
        .filter((f) => !f.relativePath.endsWith("/_README.md"))
        .map((f): Session => {
          const name = f.relativePath.split("/").pop() ?? "";
          const match = name.match(FILENAME_RE);
          const date = match?.[1] ?? null;
          const slug = match?.[2] ?? match?.[1] ?? name.replace(/\.md$/, "");
          const fm = f.frontmatter as SessionFrontmatter;
          const title = deriveTitle(slug, f.body, date);
          return {
            ...f,
            frontmatter: fm,
            source: src,
            slug,
            title,
            date,
          };
        });
    }),
  );

  const all = groups.flat().sort((a, b) => {
    const aKey = `${a.date ?? ""} ${a.frontmatter.time ?? ""}`;
    const bKey = `${b.date ?? ""} ${b.frontmatter.time ?? ""}`;
    return bKey.localeCompare(aKey);
  });

  return opts.limit ? all.slice(0, opts.limit) : all;
}
