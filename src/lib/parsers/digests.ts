import { listMarkdown } from "../vault";
import type { Digest, DigestFrontmatter } from "../types";

const FILENAME_DATE_RE = /^(\d{4}-\d{2}-\d{2})/;

export async function getDigests(
  opts: { limit?: number } = {},
): Promise<Digest[]> {
  const files = await listMarkdown("Research/Digests");
  const sorted = files
    .map((f): Digest => {
      const name = f.relativePath.split("/").pop() ?? "";
      const date = name.match(FILENAME_DATE_RE)?.[1] ?? null;
      return {
        ...f,
        frontmatter: f.frontmatter as DigestFrontmatter,
        date,
      };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}
