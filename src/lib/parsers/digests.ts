import { listMarkdown } from "../vault";
import type { Digest, DigestFrontmatter } from "../types";

export async function getDigests(
  opts: { limit?: number } = {},
): Promise<Digest[]> {
  const files = await listMarkdown("Research/Digests");
  const sorted = files
    .map((f) => ({ ...f, frontmatter: f.frontmatter as DigestFrontmatter }))
    .sort((a, b) =>
      (b.frontmatter.date ?? "").localeCompare(a.frontmatter.date ?? ""),
    );
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}
