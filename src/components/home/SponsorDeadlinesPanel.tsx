import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatUsd } from "@/lib";
import type { SponsorBrand, SponsorDeal, SponsorStatus } from "@/lib";

type Props = {
  brands: SponsorBrand[];
};

type DealRow = {
  brandName: string;
  brandSlug: string;
  brandStatus: SponsorStatus;
  deal: SponsorDeal;
};

const STATUS_TONE: Record<SponsorStatus, string> = {
  active: "text-accent",
  ongoing: "text-accent",
  delivered: "text-emerald-300",
  dormant: "text-muted",
  unknown: "text-muted",
};

const DATE_RE = /(\d{4}-\d{2}-\d{2})/;

function extractDue(detail: string): string | null {
  const match = detail.match(DATE_RE);
  if (match) return match[1];
  if (/delivered/i.test(detail)) return "delivered";
  if (/recording/i.test(detail)) return "recording";
  if (/ongoing|umbrella/i.test(detail)) return "ongoing";
  return null;
}

export function SponsorDeadlinesPanel({ brands }: Props) {
  const rows: DealRow[] = brands.flatMap((b) =>
    b.activeDeals.map((deal) => ({
      brandName: b.name,
      brandSlug: b.slug,
      brandStatus: b.status,
      deal,
    })),
  );
  rows.sort((a, b) => {
    const aDate = a.deal.detail.match(DATE_RE)?.[1] ?? "9999";
    const bDate = b.deal.detail.match(DATE_RE)?.[1] ?? "9999";
    return aDate.localeCompare(bDate);
  });
  const totalOutstanding = brands.reduce(
    (sum, b) => sum + b.totals.outstandingUsd,
    0,
  );

  return (
    <Card>
      <CardHeader
        title="Sponsor Deadlines"
        meta={`${rows.length} active · ${formatUsd(totalOutstanding)} outstanding`}
      />
      <CardBody className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-[14px] text-muted/60 italic">
            No active deals. Drop a file in <code>Business/Sponsors/</code>.
          </p>
        ) : (
          rows.map((r) => <DealRowView key={`${r.brandSlug}-${r.deal.name}`} row={r} />)
        )}
      </CardBody>
    </Card>
  );
}

function DealRowView({ row }: { row: DealRow }) {
  const { deal, brandName, brandSlug, brandStatus } = row;
  const total = deal.totalUsd ?? 0;
  const paid = deal.paidUsd ?? 0;
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const due = extractDue(deal.detail);
  return (
    <Link
      href={`/sponsors/${brandSlug}`}
      className="block space-y-1 hover:bg-surface-2/30 -mx-1 px-1 py-1 rounded transition-colors"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-base font-medium text-foreground shrink-0">
            {brandName}
          </span>
          <span className="text-sm text-muted truncate">{deal.name}</span>
        </div>
        {due && (
          <span className="text-sm text-muted shrink-0 font-mono">{due}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[13px] text-muted font-mono tabular-nums shrink-0">
          {deal.paidUsd != null ? formatUsd(deal.paidUsd) : "—"}/
          {deal.totalUsd != null ? formatUsd(deal.totalUsd) : "—"}
        </span>
      </div>
      <div className={`text-[13px] ${STATUS_TONE[brandStatus]}`}>
        {brandStatus}
      </div>
    </Link>
  );
}
