import { listMarkdown } from "../vault";
import type { Session, SessionFrontmatter, SessionSource } from "../types";

const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})(?:-(.+))?\.md$/;

export async function getSessions(
  opts: { limit?: number; source?: SessionSource } = {},
): Promise<Session[]> {
  const sources: SessionSource[] = opts.source
    ? [opts.source]
    : ["claude", "openclaw"];

  const groups = await Promise.all(
    sources.map(async (src) => {
      const dir =
        src === "claude" ? "Core/Sessions/Claude" : "Core/Sessions/OpenClaw";
      const files = await listMarkdown(dir);
      return files
        .filter((f) => !f.relativePath.endsWith("/_README.md"))
        .map((f): Session => {
          const name = f.relativePath.split("/").pop() ?? "";
          const match = name.match(FILENAME_RE);
          const slug = match?.[2] ?? match?.[1] ?? name.replace(/\.md$/, "");
          return {
            ...f,
            frontmatter: f.frontmatter as SessionFrontmatter,
            source: src,
            slug,
          };
        });
    }),
  );

  const all = groups.flat().sort((a, b) => {
    const aKey = `${a.frontmatter.date ?? ""} ${a.frontmatter.time ?? ""}`;
    const bKey = `${b.frontmatter.date ?? ""} ${b.frontmatter.time ?? ""}`;
    return bKey.localeCompare(aKey);
  });

  return opts.limit ? all.slice(0, opts.limit) : all;
}
