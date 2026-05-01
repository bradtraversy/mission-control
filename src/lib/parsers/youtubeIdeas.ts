import { listMarkdown } from "../vault";
import { sectionBody } from "../markdown";

export type YoutubeIdeaStatus = "idea" | "consider" | "shortlist" | "dropped";
export type YoutubeIdeaScore = "skip" | "consider" | "shortlist";
export type YoutubeIdeaFormat =
  | "reaction"
  | "tutorial"
  | "trend"
  | "review"
  | "talking-head"
  | "unknown";
export type YoutubeIdeaShelfLife = "hot" | "medium" | "evergreen" | "unknown";
export type YoutubeIdeaDroppedReason = "stale" | "rejected" | null;

export type YoutubeIdea = {
  filename: string;
  relativePath: string;
  title: string;
  hook: string;
  whyItMatters: string;
  body: string;
  status: YoutubeIdeaStatus;
  score: YoutubeIdeaScore | null;
  created: string | null;
  sourceDate: string | null;
  format: YoutubeIdeaFormat;
  category: string | null;
  shelfLife: YoutubeIdeaShelfLife;
  sources: string[];
  droppedReason: YoutubeIdeaDroppedReason;
  videoFolder: string | null;
};

const VALID_STATUSES: ReadonlySet<YoutubeIdeaStatus> = new Set([
  "idea",
  "consider",
  "shortlist",
  "dropped",
]);
const VALID_SCORES: ReadonlySet<YoutubeIdeaScore> = new Set([
  "skip",
  "consider",
  "shortlist",
]);
const VALID_FORMATS: ReadonlySet<YoutubeIdeaFormat> = new Set([
  "reaction",
  "tutorial",
  "trend",
  "review",
  "talking-head",
]);
const VALID_SHELF_LIFE: ReadonlySet<YoutubeIdeaShelfLife> = new Set([
  "hot",
  "medium",
  "evergreen",
]);

function strOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

// gray-matter parses YAML date scalars as Date objects, which JSON-serialize to
// full ISO strings ("2026-04-28T00:00:00.000Z"). For our YYYY-MM-DD use case
// the time component is noise — slice it off when it matches the ISO shape.
function dateOnly(value: unknown): string | null {
  const s = strOrNull(value);
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function asStatus(value: unknown): YoutubeIdeaStatus {
  if (typeof value === "string" && VALID_STATUSES.has(value as YoutubeIdeaStatus)) {
    return value as YoutubeIdeaStatus;
  }
  return "idea";
}

function asScore(value: unknown): YoutubeIdeaScore | null {
  if (typeof value === "string" && VALID_SCORES.has(value as YoutubeIdeaScore)) {
    return value as YoutubeIdeaScore;
  }
  return null;
}

function asFormat(value: unknown): YoutubeIdeaFormat {
  if (typeof value === "string" && VALID_FORMATS.has(value as YoutubeIdeaFormat)) {
    return value as YoutubeIdeaFormat;
  }
  return "unknown";
}

function asShelfLife(value: unknown): YoutubeIdeaShelfLife {
  if (
    typeof value === "string" &&
    VALID_SHELF_LIFE.has(value as YoutubeIdeaShelfLife)
  ) {
    return value as YoutubeIdeaShelfLife;
  }
  return "unknown";
}

function asDroppedReason(value: unknown): YoutubeIdeaDroppedReason {
  if (value === "stale" || value === "rejected") return value;
  return null;
}

function asSources(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function firstHeadingTitle(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : fallback;
}

export async function getYoutubeIdeas(): Promise<YoutubeIdea[]> {
  const files = await listMarkdown("Research/YouTube", {
    filter: (rel) => {
      const base = rel.split("/").pop() ?? "";
      return base !== "README.md";
    },
  });
  const ideas: YoutubeIdea[] = [];
  for (const file of files) {
    const fm = file.frontmatter as Record<string, unknown>;
    if (fm.type !== "youtube-idea") continue;
    const filename = file.relativePath.split("/").pop() ?? "";
    const fallbackTitle = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "").replace(/-/g, " ");
    const title = firstHeadingTitle(file.body, fallbackTitle);
    const hook = (sectionBody(file.body, "Hook") ?? "").trim();
    const whyItMatters = (sectionBody(file.body, "Why It Matters") ?? "").trim();
    ideas.push({
      filename,
      relativePath: file.relativePath,
      title,
      hook,
      whyItMatters,
      body: file.body,
      status: asStatus(fm.status),
      score: asScore(fm.score),
      created: dateOnly(fm.created),
      sourceDate: dateOnly(fm.source_date),
      format: asFormat(fm.format),
      category: strOrNull(fm.category),
      shelfLife: asShelfLife(fm.shelf_life),
      sources: asSources(fm.sources),
      droppedReason: asDroppedReason(fm.dropped_reason),
      videoFolder: strOrNull(fm.video_folder),
    });
  }
  ideas.sort((a, b) => {
    const aKey = a.created ?? "";
    const bKey = b.created ?? "";
    return bKey.localeCompare(aKey);
  });
  return ideas;
}
