import { listMarkdown } from "../vault";
import type { Session, SessionFrontmatter, SessionSource } from "../types";

const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})(?:-(.+))?\.md$/;
const HEADING_RE = /^#{1,3}\s+(.+?)\s*$/m;

function deriveTitle(slug: string, body: string, date: string | null): string {
  if (!(date && slug === date)) {
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const heading = body.match(HEADING_RE)?.[1]?.trim();
  if (!heading) return "Daily log";
  const cleaned = heading
    .replace(/^Session\s+/i, "")
    .replaceAll(date, "")
    .replace(/^[—\-–:\s]+|[—\-–:\s]+$/g, "")
    .trim();
  if (!cleaned) return "Daily log";
  return cleaned;
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
