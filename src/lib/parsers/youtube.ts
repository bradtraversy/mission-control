import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { resolveVaultPath, resolveVaultRelativePath } from "../vault";
import type {
  YoutubeRecentSnapshot,
  YoutubeRecentUpload,
  YoutubeSponsor,
  YoutubeVideo,
} from "../types";

const PHASE_LINE_RE = /^- \[([ x])\] (.+?)\s*$/gm;

function coerceString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseSponsor(raw: unknown): YoutubeSponsor | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = coerceString(obj.name);
  if (!name) return null;
  return {
    name,
    totalUsd: coerceNumber(obj.total_usd),
    paidUsd: coerceNumber(obj.paid_usd),
    notes: coerceString(obj.notes),
  };
}

type Phase = { label: string; done: boolean };

function parsePhases(body: string): Phase[] {
  const phases: Phase[] = [];
  // Locate the "## Phases" section so we don't pick up other checklists.
  const sectionStart = body.search(/^##\s+Phases\b/m);
  if (sectionStart < 0) return phases;
  const after = body.slice(sectionStart);
  const nextHeading = after.slice(2).search(/^##\s+/m);
  const slice = nextHeading < 0 ? after : after.slice(0, nextHeading + 2);
  for (const m of slice.matchAll(PHASE_LINE_RE)) {
    phases.push({ done: m[1] === "x", label: m[2].trim() });
  }
  return phases;
}

function classifyStatus(status: string | null): YoutubeVideo["statusTone"] {
  const s = (status ?? "").toLowerCase();
  if (s.includes("paus") || s.includes("hold")) return "paused";
  if (s.includes("publish")) return "published";
  return "in-progress";
}

async function parseVideoFolder(
  folderName: string,
  archived: boolean,
): Promise<YoutubeVideo | null> {
  const root = resolveVaultPath();
  const folder = archived
    ? path.join(root, "YouTube", "Archive", folderName)
    : path.join(root, "YouTube", folderName);
  const progressPath = path.join(folder, "Progress.md");
  let raw: string;
  try {
    raw = await fs.readFile(progressPath, "utf-8");
  } catch {
    // Folder exists but no Progress.md — skip silently. Probably an
    // in-progress scaffold, not a fully-tracked video yet.
    return null;
  }
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const phases = parsePhases(parsed.content);
  const completedPhases = phases.filter((p) => p.done).length;
  return {
    folderName,
    archived,
    title: coerceString(fm.title) ?? folderName,
    status: coerceString(fm.status),
    statusTone: classifyStatus(coerceString(fm.status)),
    targetPublish: coerceString(fm.target_publish),
    lastUpdated: coerceString(fm.last_updated),
    repoUrl: coerceString(fm.repo_url),
    sponsor: parseSponsor(fm.sponsor),
    phases,
    completedPhases,
    totalPhases: phases.length,
  };
}

export async function getYoutubeVideos(
  opts: { includeArchived?: boolean } = {},
): Promise<YoutubeVideo[]> {
  const youtubeDir = resolveVaultRelativePath("YouTube");
  let activeEntries;
  try {
    activeEntries = await fs.readdir(youtubeDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const activeFolders = activeEntries
    .filter((e) => e.isDirectory() && e.name !== "Archive")
    .map((e) => parseVideoFolder(e.name, false));

  const archivedFolders: Promise<YoutubeVideo | null>[] = [];
  if (opts.includeArchived) {
    const archiveDir = path.join(youtubeDir, "Archive");
    try {
      const entries = await fs.readdir(archiveDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          archivedFolders.push(parseVideoFolder(e.name, true));
        }
      }
    } catch {
      // Archive doesn't exist yet — fine.
    }
  }

  const all = await Promise.all([...activeFolders, ...archivedFolders]);
  return all.filter((v): v is YoutubeVideo => v !== null);
}

export async function getYoutubeRecent(): Promise<YoutubeRecentSnapshot> {
  const filePath = resolveVaultRelativePath("Network/data/youtube-recent.json");
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    return { generatedAt: null, count: 0, videos: [] };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { generatedAt: null, count: 0, videos: [] };
  }
  if (!data || typeof data !== "object") {
    return { generatedAt: null, count: 0, videos: [] };
  }
  const obj = data as Record<string, unknown>;
  const items = Array.isArray(obj.videos) ? (obj.videos as Record<string, unknown>[]) : [];
  const videos: YoutubeRecentUpload[] = items.flatMap((v) => {
    const videoId = coerceString(v.video_id);
    if (!videoId) return [];
    return [{
      videoId,
      title: coerceString(v.title) ?? "(untitled)",
      publishedAt: coerceString(v.published_at),
      thumbnailUrl: coerceString(v.thumbnail_url),
      durationSeconds: coerceNumber(v.duration_seconds),
      viewCount: coerceNumber(v.view_count),
      likeCount: coerceNumber(v.like_count),
      commentCount: coerceNumber(v.comment_count),
      url: coerceString(v.url) ?? `https://www.youtube.com/watch?v=${videoId}`,
    }];
  });
  return {
    generatedAt: coerceString(obj.generated_at),
    count: videos.length,
    videos,
  };
}
