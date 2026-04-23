import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatRelativeTime, type Task } from "@/lib";

type Props = {
  tasks: Task[];
};

const AGENT_STYLE: Record<string, string> = {
  travis: "bg-accent/15 text-accent",
  claude: "bg-emerald-400/15 text-emerald-300",
  brad: "bg-surface-2 text-foreground",
};

const STATUS_STYLE: Record<string, string> = {
  queued: "text-muted",
  claimed: "text-accent",
  done: "text-emerald-400",
};

export function TasksPanel({ tasks }: Props) {
  return (
    <Card>
      <CardHeader
        title="Active Tasks"
        meta={tasks.length === 0 ? "queue empty" : `${tasks.length} shown`}
        action={
          <Link
            href="/tasks"
            className="text-[11px] text-muted hover:text-foreground"
          >
            View →
          </Link>
        }
      />
      <CardBody className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">
            No queued or in-progress tasks. Ping Travis or drop a new task in
            the Tasks tab.
          </p>
        ) : (
          tasks.map((t) => (
            <div key={t.relativePath} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-foreground truncate flex-1">
                  {t.title}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider shrink-0 ${
                    STATUS_STYLE[t.status] ?? "text-muted"
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    AGENT_STYLE[t.agent] ?? AGENT_STYLE.brad
                  }`}
                >
                  {t.agent}
                </span>
                {t.refTodo && (
                  <span className="text-[10px] text-muted/70">
                    ref {t.refTodo.column[0].toUpperCase() + t.refTodo.column.slice(1)}#{t.refTodo.id}
                  </span>
                )}
                <span className="text-[10px] text-muted ml-auto">
                  {formatRelativeTime(t.created)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
