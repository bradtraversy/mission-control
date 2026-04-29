import fs from "node:fs/promises";
import matter from "gray-matter";
import { resolveVaultRelativePath } from "../vault";

export type DailyCalendarEvent = {
  time: string;
  title: string;
};

export type DailyBriefing = {
  date: string;
  generatedAt: string | null;
  calendar: DailyCalendarEvent[];
  calendarEmpty: boolean;
  suggestedOrder: string[];
  lastUpdate: string | null;
  filePath: string;
};

const HEADING_RE = /^##\s+(.+?)\s*$/gm;
const UPDATE_HEADING_RE = /^Update\s+(\d{1,2}:\d{2})\s*$/i;

// Splits the body into sections keyed by heading. Multiple sections with the
// same heading are kept in document order so callers can pick the most-recent.
function collectSections(
  body: string,
): { heading: string; content: string; index: number }[] {
  const matches: { heading: string; index: number }[] = [];
  for (const m of body.matchAll(HEADING_RE)) {
    if (m.index === undefined) continue;
    matches.push({ heading: m[1].trim(), index: m.index + m[0].length });
  }
  const sections: { heading: string; content: string; index: number }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index - matches[i + 1].heading.length - 4 : body.length;
    sections.push({
      heading: matches[i].heading,
      content: body.slice(start, end).trim(),
      index: matches[i].index,
    });
  }
  return sections;
}

function lastSection(
  sections: ReturnType<typeof collectSections>,
  predicate: (heading: string) => boolean,
): { heading: string; content: string } | null {
  for (let i = sections.length - 1; i >= 0; i--) {
    if (predicate(sections[i].heading)) return sections[i];
  }
  return null;
}

const CAL_EVENT_RE = /^\s*-\s+(?:\*\*)?([^*\-—]+(?:[–-][^*\-—]+)?)\s*(?:\*\*)?\s*[—-]\s*(.+?)\s*$/;
const NO_EVENTS_RE = /^\s*-?\s*(?:\*\*)?nothing on the calendar/i;

function parseCalendar(content: string | null): {
  events: DailyCalendarEvent[];
  empty: boolean;
} {
  if (!content) return { events: [], empty: true };
  const lines = content.split(/\r?\n/);
  const events: DailyCalendarEvent[] = [];
  let sawAnyBullet = false;
  let sawNoEventsMarker = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (NO_EVENTS_RE.test(line)) {
      sawNoEventsMarker = true;
      continue;
    }
    if (!line.startsWith("-")) continue;
    sawAnyBullet = true;
    // Strip leading ** if the time block is bolded; capture time + title.
    const cleaned = line.replace(/^-\s*/, "");
    const m = cleaned.match(/^\*\*([^*]+)\*\*\s*[—-]\s*(.+)$/);
    if (m) {
      events.push({ time: m[1].trim(), title: m[2].trim() });
      continue;
    }
    const fallback = cleaned.match(CAL_EVENT_RE);
    if (fallback) {
      events.push({ time: fallback[1].trim(), title: fallback[2].trim() });
    }
  }
  const empty = events.length === 0 && (sawNoEventsMarker || !sawAnyBullet);
  return { events, empty };
}

const NUMBERED_RE = /^\s*\d+\.\s+(.+?)\s*$/;

function parseSuggestedOrder(content: string | null, max = 5): string[] {
  if (!content) return [];
  const items: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const m = raw.match(NUMBERED_RE);
    if (!m) continue;
    items.push(m[1].trim());
    if (items.length >= max) break;
  }
  return items;
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDailyBriefing(
  date?: string,
): Promise<DailyBriefing | null> {
  const targetDate = date ?? todayDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
  const relative = `Daily/${targetDate}.md`;
  const absolute = resolveVaultRelativePath(relative);
  let raw: string;
  try {
    raw = await fs.readFile(absolute, "utf-8");
  } catch {
    return null;
  }
  const parsed = matter(raw);
  const fm = parsed.data as { date?: string; generated_by?: string };
  const sections = collectSections(parsed.content);

  const calendarSection = lastSection(sections, (h) =>
    /today'?s\s+calendar/i.test(h),
  );
  const suggestedSection = lastSection(sections, (h) =>
    /suggested\s+order/i.test(h),
  );
  const updateSection = lastSection(sections, (h) => UPDATE_HEADING_RE.test(h));
  const lastUpdate = updateSection
    ? updateSection.heading.match(UPDATE_HEADING_RE)?.[1] ?? null
    : null;

  const { events, empty } = parseCalendar(calendarSection?.content ?? null);
  const suggestedOrder = parseSuggestedOrder(suggestedSection?.content ?? null);

  return {
    date: typeof fm.date === "string" ? fm.date : targetDate,
    generatedAt: extractGeneratedTime(parsed.content),
    calendar: events,
    calendarEmpty: empty,
    suggestedOrder,
    lastUpdate,
    filePath: relative,
  };
}

function extractGeneratedTime(body: string): string | null {
  // The skill writes `> Generated HH:MM. Edit freely…` near the top.
  const m = body.match(/Generated\s+(\d{1,2}:\d{2})/i);
  return m ? m[1] : null;
}
