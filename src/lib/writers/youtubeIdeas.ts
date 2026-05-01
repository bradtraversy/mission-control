import fs from "node:fs/promises";
import path from "node:path";
import { resolveVaultRelativePath } from "../vault";
import type { YoutubeIdeaStatus } from "../parsers/youtubeIdeas";

const FILENAME_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Za-z0-9-]+\.md$/;
const VALID_STATUSES: ReadonlySet<YoutubeIdeaStatus> = new Set([
  "idea",
  "consider",
  "shortlist",
  "dropped",
]);

async function writeFileAtomic(absolute: string, contents: string): Promise<void> {
  const dir = path.dirname(absolute);
  const tmp = path.join(dir, `.${path.basename(absolute)}.tmp-${process.pid}`);
  await fs.writeFile(tmp, contents, "utf-8");
  await fs.rename(tmp, absolute);
}

function assertSafeFilename(filename: string): void {
  if (!FILENAME_RE.test(filename)) {
    throw new Error(`invalid idea filename: ${filename}`);
  }
}

function resolveIdeaFile(filename: string): string {
  assertSafeFilename(filename);
  return path.join(resolveVaultRelativePath("Research/YouTube"), filename);
}

export function isSafeIdeaFilename(filename: string): boolean {
  return FILENAME_RE.test(filename);
}

export function isValidIdeaStatus(status: string): status is YoutubeIdeaStatus {
  return VALID_STATUSES.has(status as YoutubeIdeaStatus);
}

const STATUS_RE = /^status:\s*.+$/m;
const DROPPED_REASON_RE = /^dropped_reason:\s*.+$/m;

export async function setYoutubeIdeaStatus(
  filename: string,
  status: YoutubeIdeaStatus,
): Promise<void> {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`invalid status: ${status}`);
  }
  const absolute = resolveIdeaFile(filename);
  const raw = await fs.readFile(absolute, "utf-8");
  if (!STATUS_RE.test(raw)) {
    throw new Error(`idea ${filename} has no status frontmatter`);
  }
  let updated = raw.replace(STATUS_RE, `status: ${status}`);

  // If transitioning *away* from dropped, strip any stale dropped_reason so the
  // file doesn't carry a misleading reason that no longer applies.
  if (status !== "dropped" && DROPPED_REASON_RE.test(updated)) {
    updated = updated.replace(DROPPED_REASON_RE, "").replace(/\n{3,}/g, "\n\n");
  }
  // If moving TO dropped via MC, we mark the reason as `rejected` so the
  // auto-archive logic (`stale`) stays distinguishable.
  if (status === "dropped") {
    if (DROPPED_REASON_RE.test(updated)) {
      updated = updated.replace(DROPPED_REASON_RE, "dropped_reason: rejected");
    } else {
      // Insert dropped_reason just after status line.
      updated = updated.replace(
        STATUS_RE,
        (m) => `${m}\ndropped_reason: rejected`,
      );
    }
  }

  if (updated === raw) {
    throw new Error("status update produced no change");
  }
  await writeFileAtomic(absolute, updated);
}
