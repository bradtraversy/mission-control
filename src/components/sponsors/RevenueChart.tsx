import { Card, CardBody } from "@/components/ui/Card";
import type { MonthlyRevenue } from "@/lib";

type Props = {
  data: MonthlyRevenue[];
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatUsdShort(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${n}`;
}

function shortLabel(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})/);
  if (!m) return month;
  const idx = Number.parseInt(m[2], 10) - 1;
  return MONTH_LABELS[idx] ?? month;
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const mantissa = value / exp;
  let nice: number;
  if (mantissa <= 1) nice = 1;
  else if (mantissa <= 2) nice = 2;
  else if (mantissa <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}

export function RevenueChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.paidUsd, 0);
  const maxValue = Math.max(...data.map((d) => d.paidUsd), 0);
  const yMax = niceCeiling(maxValue);

  const VB_WIDTH = 800;
  const VB_HEIGHT = 220;
  const PAD_LEFT = 56;
  const PAD_RIGHT = 16;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 28;
  const plotW = VB_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = VB_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slotW = plotW / data.length;
  const barW = slotW * 0.62;
  const barOffset = (slotW - barW) / 2;

  const gridLines = [0, 0.5, 1].map((frac) => ({
    y: PAD_TOP + plotH * (1 - frac),
    label: formatUsdShort(yMax * frac),
  }));

  return (
    <Card>
      <CardBody className="space-y-3 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
            Revenue · last 12 months
          </h2>
          <div className="text-[12px] text-muted/60">
            <span className="font-mono text-foreground/80">
              {formatUsdShort(total)}
            </span>{" "}
            verified paid
          </div>
        </div>
        <svg
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="w-full h-[220px]"
          role="img"
          aria-label="Monthly revenue, last 12 months"
        >
          {gridLines.map((g, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={PAD_LEFT}
                x2={VB_WIDTH - PAD_RIGHT}
                y1={g.y}
                y2={g.y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray={i === 0 ? "0" : "2 4"}
              />
              <text
                x={PAD_LEFT - 6}
                y={g.y + 4}
                textAnchor="end"
                className="fill-muted/60"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {g.label}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD_LEFT + i * slotW + barOffset;
            const h = yMax > 0 ? (d.paidUsd / yMax) * plotH : 0;
            const y = PAD_TOP + plotH - h;
            const isCurrent = i === data.length - 1;
            return (
              <g key={d.month}>
                {d.paidUsd > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 1)}
                    rx={2}
                    className={isCurrent ? "fill-accent" : "fill-accent/70"}
                  />
                )}
                {d.paidUsd > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className="fill-foreground/80"
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                  >
                    {formatUsdShort(d.paidUsd)}
                  </text>
                )}
                <text
                  x={x + barW / 2}
                  y={VB_HEIGHT - 10}
                  textAnchor="middle"
                  className={
                    isCurrent ? "fill-foreground/80" : "fill-muted/60"
                  }
                  fontSize="11"
                  fontFamily="ui-monospace, monospace"
                >
                  {shortLabel(d.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </CardBody>
    </Card>
  );
}
