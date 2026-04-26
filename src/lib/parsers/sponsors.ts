import { listMarkdown, readMarkdown } from "../vault";
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

export type SponsorStatus =
  | "active"
  | "delivered"
  | "ongoing"
  | "dormant"
  | "unknown";

export type SponsorDeal = {
  name: string;
  totalUsd: number | null;
  paidUsd: number | null;
  outstandingUsd: number | null;
  detail: string;
};

export type SponsorPayment = {
  date: string;
  amount: number | null;
  deal: string;
  method: string;
  verified: boolean;
  notes: string;
};

export type SponsorContact = {
  primary: string | null;
  email: string | null;
  source: string | null;
};

export type SponsorBrand = {
  name: string;
  slug: string;
  filePath: string;
  status: SponsorStatus;
  contact: SponsorContact;
  lastUpdated: string | null;
  activeDeals: SponsorDeal[];
  pastDeals: SponsorDeal[];
  payments: SponsorPayment[];
  totals: {
    committedUsd: number;
    paidUsd: number;
    outstandingUsd: number;
  };
};

export type SponsorBrandsSnapshot = {
  brands: SponsorBrand[];
  totals: {
    committedUsd: number;
    paidUsd: number;
    outstandingUsd: number;
  };
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
    if (/^\|[\s\-|]+\|$/.test(trimmed)) continue;
    if (/^\|\s*Sponsor\s*\|/i.test(trimmed)) continue;
    const parsed = parseRow(trimmed);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

const VALID_STATUSES: ReadonlySet<SponsorStatus> = new Set([
  "active",
  "delivered",
  "ongoing",
  "dormant",
]);

function normalizeStatus(value: unknown): SponsorStatus {
  if (typeof value !== "string") return "unknown";
  const v = value.trim().toLowerCase();
  return VALID_STATUSES.has(v as SponsorStatus)
    ? (v as SponsorStatus)
    : "unknown";
}

function strOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "?" || trimmed === "unknown") return null;
  return trimmed;
}

function parseDealBullet(line: string): SponsorDeal | null {
  const bullet = line.replace(/^\s*-\s+/, "").trim();
  if (!bullet) return null;
  const boldMatch = bullet.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  const name = boldMatch ? boldMatch[1].trim() : bullet.split("—")[0].trim();
  const detail = boldMatch
    ? boldMatch[2].trim().replace(/^—\s*/, "")
    : bullet.replace(/^[^—]*—\s*/, "");
  const totalMatch = detail.match(
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)(K|M)?\s*total/i,
  );
  const paidMatch = detail.match(
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)(K|M)?\s*paid/i,
  );
  const totalUsd = totalMatch ? parseUsd(`${totalMatch[1]}${totalMatch[2] ?? ""}`) : null;
  const paidUsd = paidMatch ? parseUsd(`${paidMatch[1]}${paidMatch[2] ?? ""}`) : null;
  const paidInFull = /paid in full/i.test(detail);
  const outstandingUsd =
    totalUsd != null && paidUsd != null
      ? Math.max(0, totalUsd - paidUsd)
      : paidInFull && totalUsd != null
        ? 0
        : null;
  return { name, totalUsd, paidUsd, outstandingUsd, detail };
}

function parseDealsSection(body: string, heading: string): SponsorDeal[] {
  const section = sectionBody(body, heading);
  if (!section) return [];
  const deals: SponsorDeal[] = [];
  for (const raw of section.split(/\r?\n/)) {
    if (!/^\s*-\s+/.test(raw)) continue;
    if (/^\s*-\s+(?:Video\s+\d|<TODO>)/i.test(raw)) continue;
    const parsed = parseDealBullet(raw);
    if (parsed && parsed.name) deals.push(parsed);
  }
  return deals;
}

function parsePaymentLog(body: string): SponsorPayment[] {
  const section = sectionBody(body, "Payment log");
  if (!section) return [];
  const rows: SponsorPayment[] = [];
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|[\s\-|]+\|$/.test(trimmed)) continue;
    if (/^\|\s*Date\s*\|/i.test(trimmed)) continue;
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .slice(1, -1);
    if (cells.length < 4) continue;
    const [date, amount, deal, method, verified, notes] = cells.concat(
      Array(6 - cells.length).fill(""),
    );
    if (/^\d{4}-XX-XX$/i.test(date)) continue;
    rows.push({
      date: cleanCell(date),
      amount: parseUsd(amount),
      deal: cleanCell(deal),
      method: cleanCell(method),
      verified: /✅/.test(verified),
      notes: cleanCell(notes),
    });
  }
  return rows;
}

function brandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getSponsorBrands(): Promise<SponsorBrandsSnapshot> {
  const files = await listMarkdown("Business/Sponsors", {
    filter: (rel) => {
      const base = rel.split("/").pop() ?? "";
      return base !== "README.md" && base !== "Email Log.md";
    },
  });
  const brands: SponsorBrand[] = [];
  for (const file of files) {
    const fm = file.frontmatter as Record<string, unknown>;
    const name =
      typeof fm.name === "string" && fm.name.trim()
        ? fm.name.trim()
        : (file.relativePath.split("/").pop() ?? "").replace(/\.md$/, "");
    const status = normalizeStatus(fm.status);
    const contactFm = (fm.contact ?? {}) as Record<string, unknown>;
    const contact: SponsorContact = {
      primary: strOrNull(contactFm.primary),
      email: strOrNull(contactFm.email),
      source: strOrNull(contactFm.source),
    };
    const lastUpdated = strOrNull(fm.last_updated);
    const activeDeals = parseDealsSection(file.body, "Active deals");
    const pastDeals = parseDealsSection(file.body, "Past deals");
    const payments = parsePaymentLog(file.body);

    const dealCommitted = activeDeals
      .concat(pastDeals)
      .reduce((sum, d) => sum + (d.totalUsd ?? 0), 0);
    const paidFromPayments = payments
      .filter((p) => p.verified)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const paidFromDeals = activeDeals
      .concat(pastDeals)
      .reduce((sum, d) => sum + (d.paidUsd ?? 0), 0);
    const paidUsd = Math.max(paidFromPayments, paidFromDeals);
    // Floor committed at paid: when a deal bullet uses non-standard wording
    // ("paid in full via coupon purchase"), totals can't always be regex'd —
    // but recorded payments are ground truth, so committed must be at least
    // what's been paid.
    const committedUsd = Math.max(dealCommitted, paidUsd);
    const outstandingUsd = Math.max(0, committedUsd - paidUsd);

    brands.push({
      name,
      slug: brandSlug(name),
      filePath: file.relativePath,
      status,
      contact,
      lastUpdated,
      activeDeals,
      pastDeals,
      payments,
      totals: { committedUsd, paidUsd, outstandingUsd },
    });
  }
  brands.sort((a, b) => {
    const aActive = a.status === "active" || a.status === "ongoing" ? 0 : 1;
    const bActive = b.status === "active" || b.status === "ongoing" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    if (b.totals.outstandingUsd !== a.totals.outstandingUsd) {
      return b.totals.outstandingUsd - a.totals.outstandingUsd;
    }
    return a.name.localeCompare(b.name);
  });
  const totals = brands.reduce(
    (acc, b) => ({
      committedUsd: acc.committedUsd + b.totals.committedUsd,
      paidUsd: acc.paidUsd + b.totals.paidUsd,
      outstandingUsd: acc.outstandingUsd + b.totals.outstandingUsd,
    }),
    { committedUsd: 0, paidUsd: 0, outstandingUsd: 0 },
  );
  return { brands, totals };
}
