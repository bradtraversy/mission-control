import { Card, CardBody } from "@/components/ui/Card";
import { buildObsidianUri, getSponsorBrands } from "@/lib";
import type {
  SponsorBrand,
  SponsorDeal,
  SponsorPayment,
  SponsorStatus,
} from "@/lib";

const STATUS_STYLE: Record<SponsorStatus, string> = {
  active: "bg-accent/15 text-accent",
  ongoing: "bg-accent/15 text-accent",
  delivered: "bg-emerald-400/15 text-emerald-300",
  dormant: "bg-surface-2 text-muted/70",
  unknown: "bg-surface-2 text-muted/70",
};

function formatUsd(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${n}`;
}

export default async function Page() {
  const { brands, totals } = await getSponsorBrands();

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Sponsors</h1>
        <p className="text-[14px] text-muted">
          Per-sponsor relationships, deals, and payment ledger · sourced from{" "}
          <code className="text-foreground/80">Business/Sponsors/</code>
        </p>
      </header>

      {brands.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-[14px] text-muted/60 italic">
              No sponsor files. Drop one under{" "}
              <code>Business/Sponsors/&lt;Name&gt;.md</code> to see it here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <TotalsBar totals={totals} brandCount={brands.length} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brands.map((b) => (
              <SponsorCard key={b.slug} brand={b} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TotalsBar({
  totals,
  brandCount,
}: {
  totals: { committedUsd: number; paidUsd: number; outstandingUsd: number };
  brandCount: number;
}) {
  return (
    <Card>
      <CardBody className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
        <Stat label="Sponsors" value={brandCount.toString()} tone="muted" />
        <Stat label="Committed" value={formatUsd(totals.committedUsd)} tone="default" />
        <Stat label="Paid" value={formatUsd(totals.paidUsd)} tone="emerald" />
        <Stat
          label="Outstanding"
          value={formatUsd(totals.outstandingUsd)}
          tone={totals.outstandingUsd > 0 ? "amber" : "muted"}
        />
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "emerald" | "amber" | "muted";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "muted"
          ? "text-muted"
          : "text-foreground";
  return (
    <div className="space-y-1">
      <div className="text-[12px] uppercase tracking-wider text-muted/60">
        {label}
      </div>
      <div className={`text-lg font-semibold font-mono ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function SponsorCard({ brand }: { brand: SponsorBrand }) {
  const obsidianUri = buildObsidianUri(brand.filePath);
  const recentPayments = brand.payments.slice(0, 3);
  return (
    <Card>
      <CardBody className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-medium text-foreground leading-snug min-w-0">
            {brand.name}
          </h2>
          <span
            className={`text-[12px] px-1.5 py-0.5 rounded shrink-0 ${STATUS_STYLE[brand.status]}`}
          >
            {brand.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[13px]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted/60">
              Committed
            </div>
            <div className="font-mono text-foreground/90">
              {formatUsd(brand.totals.committedUsd)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted/60">
              Paid
            </div>
            <div className="font-mono text-emerald-300">
              {formatUsd(brand.totals.paidUsd)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted/60">
              Outstanding
            </div>
            <div
              className={`font-mono ${brand.totals.outstandingUsd > 0 ? "text-amber-300" : "text-muted"}`}
            >
              {formatUsd(brand.totals.outstandingUsd)}
            </div>
          </div>
        </div>

        {(brand.contact.primary || brand.contact.email) && (
          <div className="text-[12px] text-muted">
            {brand.contact.primary && <span>{brand.contact.primary}</span>}
            {brand.contact.primary && brand.contact.email && (
              <span className="text-muted/40"> · </span>
            )}
            {brand.contact.email && (
              <span className="font-mono text-muted/80">{brand.contact.email}</span>
            )}
          </div>
        )}

        {brand.activeDeals.length > 0 && (
          <DealList heading="Active deals" deals={brand.activeDeals} />
        )}
        {brand.pastDeals.length > 0 && (
          <DealList heading="Past deals" deals={brand.pastDeals} muted />
        )}

        {recentPayments.length > 0 && (
          <PaymentTable payments={recentPayments} totalCount={brand.payments.length} />
        )}

        <div className="flex items-center justify-end pt-1">
          <a
            href={obsidianUri}
            className="text-muted hover:text-foreground text-[12px]"
          >
            Open ↗
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

function DealList({
  heading,
  deals,
  muted = false,
}: {
  heading: string;
  deals: SponsorDeal[];
  muted?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted/60">
        {heading}
      </div>
      <ul className="space-y-1">
        {deals.map((d, i) => (
          <li
            key={`${d.name}-${i}`}
            className={`text-[13px] ${muted ? "text-muted/80" : "text-foreground/90"}`}
          >
            <span className="font-medium">{d.name}</span>
            {(d.totalUsd != null || d.paidUsd != null) && (
              <span className="text-muted ml-2 font-mono text-[12px]">
                {d.totalUsd != null && <>{formatUsd(d.totalUsd)} total</>}
                {d.totalUsd != null && d.paidUsd != null && (
                  <span className="text-muted/40"> · </span>
                )}
                {d.paidUsd != null && <>{formatUsd(d.paidUsd)} paid</>}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentTable({
  payments,
  totalCount,
}: {
  payments: SponsorPayment[];
  totalCount: number;
}) {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted/60">
          Payment log
        </div>
        {totalCount > payments.length && (
          <div className="text-[11px] text-muted/60">
            showing {payments.length} of {totalCount}
          </div>
        )}
      </div>
      <ul className="divide-y divide-border/40 rounded border border-border/40">
        {payments.map((p, i) => (
          <li
            key={`${p.date}-${i}`}
            className="flex items-center gap-2 px-2 py-1.5 text-[12px]"
          >
            <span className="font-mono text-muted/80 shrink-0 w-[88px]">
              {p.date}
            </span>
            <span className="font-mono shrink-0 w-[64px] text-foreground/90">
              {p.amount != null ? formatUsd(p.amount) : "—"}
            </span>
            <span className="text-muted/80 truncate flex-1" title={p.deal}>
              {p.deal}
            </span>
            <span className="shrink-0 text-[10px]">
              {p.verified ? (
                <span className="text-emerald-300" title="verified">
                  ✓
                </span>
              ) : (
                <span className="text-amber-300" title="unverified">
                  ?
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
