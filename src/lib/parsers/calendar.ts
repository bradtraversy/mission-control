import fs from "node:fs/promises";
import matter from "gray-matter";
import { resolveVaultRelativePath } from "../vault";
import type {
  CalendarEvent,
  CalendarEventFlag,
  CalendarGroup,
  CalendarSnapshot,
} from "../types";

const GROUP_BY_HEADING: Record<string, CalendarGroup> = {
  "this week": "this-week",
  "next week": "next-week",
  later: "later",
};

const EVENT_RE = /^-\s+\*\*(.+?)\*\*\s*—\s*(.+?)\s*$/;
const FLAG_RE = /_\(([^)]+)\)_/;
const PROJECT_RE = /→\s*\[\[([^\]]+)\]\]/;
const TAG_RE = /(?:^|\s)#([a-z0-9][a-z0-9-]*)/gi;

function parseFlags(raw: string): CalendarEventFlag[] {
  const known = new Set(["all-day", "recurring", "informational"]);
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is CalendarEventFlag => known.has(s));
}

function parseEvent(line: string, group: CalendarGroup): CalendarEvent | null {
  const match = line.match(EVENT_RE);
  if (!match) return null;

  const bold = match[1].trim();
  let remainder = match[2].trim();

  const [dayPart, ...timeParts] = bold.split(",");
  const dayLabel = dayPart.trim();
  const timeRange = timeParts.length > 0 ? timeParts.join(",").trim() : null;

  let flags: CalendarEventFlag[] = [];
  const flagMatch = remainder.match(FLAG_RE);
  if (flagMatch) {
    flags = parseFlags(flagMatch[1]);
    remainder = remainder.replace(FLAG_RE, "").trim();
  }

  let project: CalendarEvent["project"] = null;
  const projectMatch = remainder.match(PROJECT_RE);
  if (projectMatch) {
    const target = projectMatch[1].trim();
    const display = target.split("/").pop() ?? target;
    project = { target, display };
    remainder = remainder.replace(PROJECT_RE, "").trim();
  }

  const tags: string[] = [];
  for (const tagMatch of remainder.matchAll(TAG_RE)) {
    tags.push(tagMatch[1].toLowerCase());
  }
  remainder = remainder.replace(TAG_RE, "").trim();

  const title = remainder.replace(/\s+$/g, "").trim();

  return {
    dayLabel,
    timeRange,
    title,
    flags,
    project,
    tags,
    group,
    raw: line,
  };
}

export async function getCalendarSnapshot(): Promise<CalendarSnapshot> {
  const absolute = resolveVaultRelativePath("Calendar/Upcoming.md");
  let raw: string;
  try {
    raw = await fs.readFile(absolute, "utf-8");
  } catch {
    return {
      lastRefreshed: null,
      source: null,
      thisWeek: [],
      nextWeek: [],
      later: [],
      total: 0,
      exists: false,
    };
  }

  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const lastRefreshed =
    typeof fm.last_refreshed === "string"
      ? fm.last_refreshed
      : fm.last_refreshed instanceof Date
        ? fm.last_refreshed.toISOString()
        : null;
  const source = typeof fm.source === "string" ? fm.source : null;

  const thisWeek: CalendarEvent[] = [];
  const nextWeek: CalendarEvent[] = [];
  const later: CalendarEvent[] = [];

  let currentGroup: CalendarGroup | null = null;

  for (const rawLine of parsed.content.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/g, "");
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      const key = h2[1].trim().toLowerCase();
      currentGroup = GROUP_BY_HEADING[key] ?? null;
      continue;
    }
    if (!currentGroup) continue;
    const event = parseEvent(line, currentGroup);
    if (!event) continue;
    if (currentGroup === "this-week") thisWeek.push(event);
    else if (currentGroup === "next-week") nextWeek.push(event);
    else later.push(event);
  }

  return {
    lastRefreshed,
    source,
    thisWeek,
    nextWeek,
    later,
    total: thisWeek.length + nextWeek.length + later.length,
    exists: true,
  };
}
