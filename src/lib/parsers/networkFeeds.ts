import fs from "node:fs/promises";
import path from "node:path";
import { resolveVaultRelativePath } from "../vault";
import type { NetworkFeed } from "../types";

export async function getNetworkFeeds(): Promise<NetworkFeed[]> {
  const dir = resolveVaultRelativePath("Network/data");
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const feeds = await Promise.all(
    entries
      .filter(
        (e) =>
          e.isFile() && e.name.endsWith(".json") && !e.name.startsWith("."),
      )
      .map(async (e): Promise<NetworkFeed> => {
        const abs = path.join(dir, e.name);
        const [raw, stats] = await Promise.all([
          fs.readFile(abs, "utf-8"),
          fs.stat(abs),
        ]);
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }
        return { filename: e.name, path: abs, mtime: stats.mtime, data };
      }),
  );
  return feeds.sort((a, b) => a.filename.localeCompare(b.filename));
}
