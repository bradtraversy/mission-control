import type { GithubContributionCalendar } from "@/lib";

type Props = {
  calendar: GithubContributionCalendar;
};

const LEVEL_FILL: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "fill-surface-2",
  1: "fill-emerald-900",
  2: "fill-emerald-700",
  3: "fill-emerald-500",
  4: "fill-emerald-400",
};

const MONTHS = [
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

export function ContributionGraph({ calendar }: Props) {
  const cell = 11;
  const gap = 3;
  const step = cell + gap;
  const padTop = 18;
  const padLeft = 26;
  const weeks = calendar.weeks;
  const cols = weeks.length;
  const rows = 7;
  const width = padLeft + cols * step;
  const height = padTop + rows * step + 4;

  // Month labels: track the first week of each calendar month and place a
  // label above its first day's column.
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIdx) => {
    const first = week[0];
    if (!first) return;
    const month = new Date(first.date).getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        x: padLeft + weekIdx * step,
        label: MONTHS[month],
      });
      lastMonth = month;
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] uppercase tracking-wider text-muted/70">
          Contributions · last year
        </h3>
        <span className="text-[12px] text-muted">
          <span className="font-mono text-foreground/80">
            {calendar.totalContributions.toLocaleString()}
          </span>{" "}
          total
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={`${calendar.totalContributions} contributions in the last year`}
          className="block"
        >
          {monthLabels.map((m, i) => (
            <text
              key={`${m.label}-${i}`}
              x={m.x}
              y={12}
              fontSize="10"
              className="fill-muted/60"
              fontFamily="ui-monospace, monospace"
            >
              {m.label}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((d, i) => {
            const dayIdx = i === 0 ? 1 : i === 1 ? 3 : 5;
            return (
              <text
                key={d}
                x={2}
                y={padTop + dayIdx * step + cell - 2}
                fontSize="9"
                className="fill-muted/60"
                fontFamily="ui-monospace, monospace"
              >
                {d}
              </text>
            );
          })}
          {weeks.map((week, weekIdx) =>
            week.map((day, dayIdx) => (
              <rect
                key={day.date}
                x={padLeft + weekIdx * step}
                y={padTop + dayIdx * step}
                width={cell}
                height={cell}
                rx={2}
                data-date={day.date}
                data-count={day.count}
                className={LEVEL_FILL[day.level]}
              />
            )),
          )}
        </svg>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted/60">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span
            key={lvl}
            className={`h-2.5 w-2.5 rounded-sm ${LEVEL_FILL[lvl as 0 | 1 | 2 | 3 | 4].replace("fill-", "bg-")}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
