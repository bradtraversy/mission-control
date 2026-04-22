import { listMarkdown } from "../vault";
import type { MemoryEntry } from "../types";

export async function getMemory(
  opts: { limit?: number } = {},
): Promise<MemoryEntry[]> {
  const files = await listMarkdown("memory");
  const sorted = files.sort((a, b) =>
    b.relativePath.localeCompare(a.relativePath),
  );
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}
