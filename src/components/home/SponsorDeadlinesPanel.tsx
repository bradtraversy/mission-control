import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatUsd, type SponsorDeadline } from "@/lib";

type Props = {
  sponsors: SponsorDeadline[];
};

export function SponsorDeadlinesPanel({ sponsors }: Props) {
  const active = sponsors.filter((s) => !s.isDone);
  return (
    <Card>
      <CardHeader
        title="Sponsor Deadlines"
        meta={`${active.length} active · ${sponsors.length - active.length} done`}
      />
      <CardBody className="space-y-3">
        {sponsors.map((s) => (
          <SponsorRow key={`${s.name}-${s.deliverable}`} sponsor={s} />
        ))}
      </CardBody>
    </Card>
  );
}

function SponsorRow({ sponsor }: { sponsor: SponsorDeadline }) {
  const progress =
    sponsor.totalUsd && sponsor.paidUsd
      ? (sponsor.paidUsd / sponsor.totalUsd) * 100
      : sponsor.isDone
        ? 100
        : 0;
  const statusColor = sponsor.isDone
    ? "text-emerald-400"
    : /blocked|stalled|overdue/i.test(sponsor.status)
      ? "text-red-400"
      : "text-accent";
  const barColor = sponsor.isDone ? "bg-emerald-400" : "bg-accent";

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-base font-medium text-foreground shrink-0">
            {sponsor.name}
          </span>
          <span className="text-sm text-muted truncate">{sponsor.deliverable}</span>
        </div>
        <span className="text-sm text-muted shrink-0">{sponsor.due}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="text-[13px] text-muted font-mono tabular-nums shrink-0">
          {formatUsd(sponsor.paidUsd)}/{formatUsd(sponsor.totalUsd)}
        </span>
      </div>
      <div className={`text-[13px] ${statusColor}`}>{sponsor.status}</div>
    </div>
  );
}
