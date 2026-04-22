import { readMarkdown } from "../vault";
import { sectionBody, stripMarkdownBold } from "../markdown";

export type SponsorDeadline = {
  name: string;
  deliverable: string;
  totalUsd: number | null;
  paidUsd: number | null;
  status: string;
  due: string;
  isDone: boolean;
  outstandingUsd: number;
};

function cleanCell(cell: string): string {
  return stripMarkdownBold(cell.trim()).trim();
}

function parseUsd(cell: string): number | null {
  const cleaned = cleanCell(cell).replace(/\$/g, "").replace(/,/g, "");
  const m = cleaned.match(/^(\d+(?:\.\d+)?)(K|M)?$/i);
  if (!m) return null;
  const base = Number.parseFloat(m[1]);
  const unit = m[2]?.toUpperCase();
  const mult = unit === "M" ? 1_000_000 : unit === "K" ? 1000 : 1;
  return Math.round(base * mult);
}

function parseRow(row: string): SponsorDeadline | null {
  // Markdown table rows look like: | name | deliverable | total | paid | status | due |
  // Split on `|`, trim each, and drop the leading/trailing empty cells.
  const cells = row
    .split("|")
    .map((c) => c.trim())
    .slice(1, -1);
  if (cells.length < 6) return null;
  const [name, deliverable, total, paid, status, due] = cells;
  const statusClean = cleanCell(status);
  const dueClean = cleanCell(due);
  const isDone =
    /^\s*done\s*$/i.test(dueClean) || /\bcomplete\b/i.test(statusClean);
  const totalUsd = parseUsd(total);
  const paidUsd = parseUsd(paid);
  const outstandingUsd =
    totalUsd !== null && paidUsd !== null && !isDone
      ? Math.max(0, totalUsd - paidUsd)
      : 0;
  return {
    name: cleanCell(name),
    deliverable: cleanCell(deliverable),
    totalUsd,
    paidUsd,
    status: statusClean,
    due: dueClean,
    isDone,
    outstandingUsd,
  };
}

export async function getSponsors(): Promise<SponsorDeadline[]> {
  const file = await readMarkdown("Core/Context/Current State.md");
  const section = sectionBody(file.body, "Active Sponsor Deadlines");
  if (!section) return [];
  const rows: SponsorDeadline[] = [];
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    // Skip separator rows (all dashes and pipes)
    if (/^\|[\s\-|]+\|$/.test(trimmed)) continue;
    // Skip header row
    if (/^\|\s*Sponsor\s*\|/i.test(trimmed)) continue;
    const parsed = parseRow(trimmed);
    if (parsed) rows.push(parsed);
  }
  return rows;
}
