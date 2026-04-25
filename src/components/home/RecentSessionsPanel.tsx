import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { truncate, type Session } from "@/lib";

type Props = {
  sessions: Session[];
};

const SOURCE_STYLE: Record<string, string> = {
  claude: "bg-emerald-400/15 text-emerald-300",
  openclaw: "bg-accent/15 text-accent",
};

export function RecentSessionsPanel({ sessions }: Props) {
  return (
    <Card>
      <CardHeader
        title="Recent Sessions"
        meta={`${sessions.length} latest`}
        action={
          <Link
            href="/sessions"
            className="text-[13px] text-muted hover:text-foreground"
          >
            View →
          </Link>
        }
      />
      <CardBody className="space-y-2.5">
        {sessions.map((s) => (
          <div key={s.relativePath} className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-[12px] px-1.5 py-0.5 rounded shrink-0 ${
                  SOURCE_STYLE[s.source] ?? "bg-surface-2 text-muted"
                }`}
              >
                {s.source}
              </span>
              <span className="text-[13px] text-muted font-mono shrink-0">
                {s.date ?? "?"}
              </span>
              <span className="text-base text-foreground truncate flex-1">
                {s.title}
              </span>
            </div>
            {s.frontmatter.outcome && (
              <p className="text-[13px] text-muted line-clamp-2">
                {truncate(s.frontmatter.outcome, 160)}
              </p>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
