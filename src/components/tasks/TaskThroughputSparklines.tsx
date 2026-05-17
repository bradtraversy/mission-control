import { Card, CardBody } from "@/components/ui/Card";
import type { TaskAgent, TaskThroughput } from "@/lib";

type Props = {
  rows: TaskThroughput[];
  windowDays: number;
};

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

const AGENT_LABEL: Record<TaskAgent, string> = {
  sysadmin: "Sysadmin",
  creator: "Creator",
  secretary: "Secretary",
  "claude-code": "Claude Code",
  "claude-cowork": "Claude Cowork",
  brad: "Brad",
};

const AGENT_TONE: Record<TaskAgent, string> = {
  sysadmin: "text-sky-300",
  creator: "text-fuchsia-300",
  secretary: "text-violet-300",
  "claude-code": "text-emerald-300",
  "claude-cowork": "text-orange-300",
  brad: "text-foreground/80",
};

function sparkline(days: number[]): string {
  const max = Math.max(...days, 1);
  return days
    .map((v) => {
      if (v === 0) return "·";
      const ratio = v / max;
      const idx = Math.min(BLOCKS.length - 1, Math.ceil(ratio * BLOCKS.length) - 1);
      return BLOCKS[Math.max(0, idx)];
    })
    .join("");
}

export function TaskThroughputSparklines({ rows, windowDays }: Props) {
  return (
    <Card>
      <CardBody className="space-y-2 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
            Throughput · last {windowDays} days
          </h2>
          <span className="text-[12px] text-muted/60">
            tasks completed per day per agent
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="text-[14px] text-muted/60 italic">
            No completions in the window. Mark a task <code>done</code> to see
            the trend.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li
                key={r.agent}
                className="flex items-center gap-3 text-[14px]"
              >
                <span className={`shrink-0 w-[120px] ${AGENT_TONE[r.agent]}`}>
                  {AGENT_LABEL[r.agent]}
                </span>
                <span
                  className={`font-mono tracking-wider ${AGENT_TONE[r.agent]}`}
                  aria-label={`${r.total} tasks across ${r.days.length} days`}
                >
                  {sparkline(r.days)}
                </span>
                <span className="text-muted/80 font-mono text-[13px] tabular-nums shrink-0">
                  {r.todayCount} today · {r.total} last {windowDays}d
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
