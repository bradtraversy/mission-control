import { readMarkdown } from "../vault";
import type { CurrentStateSnapshot } from "../types";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionBody(body: string, heading: string): string | null {
  const re = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, "m");
  const match = body.match(re);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextIdx = rest.search(/^##\s+/m);
  return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).trim();
}

// Accepts ordinary bullets (`- x`, `* x`), numbered items (`1. x`), and any of
// those nested inside a blockquote (`> - x`, `> 1. x`). Current State.md uses
// a blockquoted numbered list for the "Top 3" under "This Week's Focus".
const BULLET_RE = /^\s*>?\s*(?:[-*]|\d+\.)\s+/;

function bulletLines(section: string | null): string[] {
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => BULLET_RE.test(l))
    .map((l) => l.replace(BULLET_RE, "").trim());
}

export async function getCurrentState(): Promise<CurrentStateSnapshot> {
  const file = await readMarkdown("Core/Context/Current State.md");
  const body = file.body;
  const thisWeek = bulletLines(sectionBody(body, "This Week's Focus")).slice(
    0,
    3,
  );
  const immediateActions = bulletLines(
    sectionBody(body, "Immediate Next Actions"),
  );
  const recentDecisions = bulletLines(
    sectionBody(body, "Recent Decisions / Changes"),
  );
  const sponsorsRaw = sectionBody(body, "Active Sponsor Deadlines") ?? "";
  const openQuestions = bulletLines(sectionBody(body, "Open Questions"));
  return {
    thisWeek,
    immediateActions,
    openQuestions,
    sponsorsRaw,
    recentDecisions,
    raw: body,
  };
}
