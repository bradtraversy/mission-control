import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { PaymentVerifyButton } from "@/components/sponsors/PaymentVerifyButton";
import { buildObsidianUri, getSponsorBrand } from "@/lib";
import type {
  SponsorBrand,
  SponsorDeal,
  SponsorEmail,
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

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await getSponsorBrand(slug);
  if (!brand) notFound();

  const obsidianUri = buildObsidianUri(brand.filePath);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <Link
        href="/sponsors"
        className="text-[13px] text-muted hover:text-foreground"
      >
        ← Back to sponsors
      </Link>

      <header className="space-y-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-medium tracking-tight">{brand.name}</h1>
          <span
            className={`text-[12px] px-1.5 py-0.5 rounded ${STATUS_STYLE[brand.status]}`}
          >
            {brand.status}
          </span>
          <a
            href={obsidianUri}
            className="ml-auto text-[13px] text-muted hover:text-foreground"
          >
            Edit in Obsidian ↗
          </a>
        </div>
        {(brand.contact.primary || brand.contact.email) && (
          <p className="text-[13px] text-muted">
            {brand.contact.primary && <span>{brand.contact.primary}</span>}
            {brand.contact.primary && brand.contact.email && (
              <span className="text-muted/40"> · </span>
            )}
            {brand.contact.email && (
              <span className="font-mono text-muted/80">
                {brand.contact.email}
              </span>
            )}
            {brand.contact.source && (
              <span className="text-muted/60"> · {brand.contact.source}</span>
            )}
          </p>
        )}
      </header>

      <TotalsCard brand={brand} />

      {brand.activeDeals.length > 0 && (
        <DealsSection title="Active deals" deals={brand.activeDeals} />
      )}
      {brand.pastDeals.length > 0 && (
        <DealsSection title="Past deals" deals={brand.pastDeals} muted />
      )}

      {brand.payments.length > 0 && (
        <PaymentsSection slug={brand.slug} payments={brand.payments} />
      )}

      {brand.emailLog.length > 0 && (
        <EmailLogSection emails={brand.emailLog} />
      )}

      {brand.notes && <NotesSection notes={brand.notes} />}
    </div>
  );
}

function TotalsCard({ brand }: { brand: SponsorBrand }) {
  return (
    <Card>
      <CardBody className="grid grid-cols-3 gap-4 pt-4">
        <Stat label="Committed" value={formatUsd(brand.totals.committedUsd)} />
        <Stat
          label="Paid"
          value={formatUsd(brand.totals.paidUsd)}
          tone="emerald"
        />
        <Stat
          label="Outstanding"
          value={formatUsd(brand.totals.outstandingUsd)}
          tone={brand.totals.outstandingUsd > 0 ? "amber" : "muted"}
        />
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "amber" | "muted";
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

function DealsSection({
  title,
  deals,
  muted = false,
}: {
  title: string;
  deals: SponsorDeal[];
  muted?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        {title}
      </h2>
      <Card>
        <CardBody className="!p-0">
          <ul className="divide-y divide-border/40">
            {deals.map((d, i) => (
              <li
                key={`${d.name}-${i}`}
                className={`px-4 py-3 ${muted ? "text-muted/80" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{d.name}</span>
                  <span className="font-mono text-[12px] text-muted/80">
                    {d.totalUsd != null && <>{formatUsd(d.totalUsd)} total</>}
                    {d.totalUsd != null && d.paidUsd != null && (
                      <span className="text-muted/40"> · </span>
                    )}
                    {d.paidUsd != null && <>{formatUsd(d.paidUsd)} paid</>}
                    {d.outstandingUsd != null && d.outstandingUsd > 0 && (
                      <>
                        <span className="text-muted/40"> · </span>
                        <span className="text-amber-300">
                          {formatUsd(d.outstandingUsd)} outstanding
                        </span>
                      </>
                    )}
                  </span>
                </div>
                {d.detail && (
                  <p className="text-[13px] text-muted mt-1">{d.detail}</p>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}

function PaymentsSection({
  slug,
  payments,
}: {
  slug: string;
  payments: SponsorPayment[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Payment log
      </h2>
      <Card>
        <CardBody className="!p-0 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted/60">
                <th className="text-left px-3 py-2 font-normal">Date</th>
                <th className="text-left px-3 py-2 font-normal">Amount</th>
                <th className="text-left px-3 py-2 font-normal">Deal</th>
                <th className="text-left px-3 py-2 font-normal">Method</th>
                <th className="text-left px-3 py-2 font-normal">Verified</th>
                <th className="text-left px-3 py-2 font-normal">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {payments.map((p, i) => (
                <tr key={`${p.date}-${i}`}>
                  <td className="px-3 py-2 font-mono text-muted/90">{p.date}</td>
                  <td className="px-3 py-2 font-mono">
                    {p.amount != null ? formatUsd(p.amount) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted/80">{p.deal}</td>
                  <td className="px-3 py-2 text-muted/80">{p.method || "—"}</td>
                  <td className="px-3 py-2">
                    {p.verified ? (
                      <span className="text-emerald-300" title="verified">
                        ✓
                      </span>
                    ) : (
                      <PaymentVerifyButton
                        slug={slug}
                        rowIndex={i}
                        initialDate={p.date}
                        initialMethod={p.method}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted/70">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </section>
  );
}

function EmailLogSection({ emails }: { emails: SponsorEmail[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Email log
      </h2>
      <Card>
        <CardBody className="!p-0">
          <ul className="divide-y divide-border/40">
            {emails.map((e, i) => (
              <li key={`${e.date}-${i}`} className="px-4 py-3 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[12px] text-muted/80">
                    {e.date}
                  </span>
                  <span className="text-[12px] text-muted/60 truncate">
                    {e.fromTo}
                  </span>
                </div>
                <div className="text-[13px] font-medium text-foreground/90">
                  {e.subject}
                </div>
                {e.summary && (
                  <p className="text-[13px] text-muted">{e.summary}</p>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}

function NotesSection({ notes }: { notes: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Notes
      </h2>
      <Card>
        <CardBody>
          <MarkdownBody content={notes} />
        </CardBody>
      </Card>
    </section>
  );
}
