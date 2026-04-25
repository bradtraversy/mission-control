export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sectionBody(body: string, heading: string): string | null {
  const re = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, "m");
  const match = body.match(re);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextIdx = rest.search(/^##\s+/m);
  return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).trim();
}

// Accepts ordinary bullets (`- x`, `* x`), numbered items (`1. x`), and any of
// those nested inside a blockquote (`> - x`, `> 1. x`).
const BULLET_RE = /^\s*>?\s*(?:[-*]|\d+\.)\s+/;

export function bulletLines(section: string | null): string[] {
  if (!section) return [];
  return section
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => BULLET_RE.test(l))
    .map((l) => l.replace(BULLET_RE, "").trim());
}

export type GroupedBullet = { text: string; group: string | null };

const H3_RE = /^###\s+(.+?)\s*$/;

// Walks a section line-by-line, tagging each bullet with the most recent `### Heading`
// it appeared under (null if no preceding H3). Lets parsers preserve subsection
// grouping while still flattening into a single ordered list.
export function bulletLinesGrouped(section: string | null): GroupedBullet[] {
  if (!section) return [];
  const items: GroupedBullet[] = [];
  let group: string | null = null;
  for (const raw of section.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h3 = line.match(H3_RE);
    if (h3) {
      group = h3[1].trim();
      continue;
    }
    if (BULLET_RE.test(line)) {
      items.push({ text: line.replace(BULLET_RE, "").trim(), group });
    }
  }
  return items;
}

export function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}
