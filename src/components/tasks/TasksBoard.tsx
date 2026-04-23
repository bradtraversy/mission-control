"use client";

import { useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import type { Task, TaskAgent, TaskStatus } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type Props = {
  tasks: Task[];
  taskUris: Record<string, string>;
};

const STATUSES: TaskStatus[] = ["queued", "claimed", "done"];
const AGENT_FILTERS: (TaskAgent | "all")[] = ["all", "travis", "claude", "brad"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  queued: "Queued",
  claimed: "Claimed",
  done: "Done",
};

const STATUS_HINTS: Record<TaskStatus, string> = {
  queued: "Waiting for pickup",
  claimed: "In progress",
  done: "Completed",
};

const AGENT_STYLE: Record<TaskAgent, string> = {
  travis: "bg-accent/15 text-accent",
  claude: "bg-emerald-400/15 text-emerald-300",
  brad: "bg-surface-2 text-foreground",
};

const AGENT_LABEL: Record<TaskAgent | "all", string> = {
  all: "All",
  travis: "Travis",
  claude: "Claude",
  brad: "Brad",
};

export function TasksBoard({ tasks, taskUris }: Props) {
  const [agentFilter, setAgentFilter] = useState<TaskAgent | "all">("all");

  const filtered = useMemo(
    () =>
      agentFilter === "all"
        ? tasks
        : tasks.filter((t) => t.agent === agentFilter),
    [tasks, agentFilter],
  );

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      queued: [],
      claimed: [],
      done: [],
    };
    for (const t of filtered) {
      if (!t.archived) groups[t.status].push(t);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {AGENT_FILTERS.map((key) => (
          <Chip
            key={key}
            label={AGENT_LABEL[key]}
            active={agentFilter === key}
            onClick={() => setAgentFilter(key)}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byStatus[status]}
            taskUris={taskUris}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
        active
          ? "bg-accent/15 border-accent/40 text-foreground"
          : "bg-surface-2/60 border-border text-muted hover:text-foreground hover:border-border/80"
      }`}
    >
      {label}
    </button>
  );
}

function Column({
  status,
  tasks,
  taskUris,
}: {
  status: TaskStatus;
  tasks: Task[];
  taskUris: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader
        title={`${STATUS_LABELS[status]} · ${STATUS_HINTS[status]}`}
        meta={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
      />
      <CardBody className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-[11px] text-muted/60 italic py-1">
            {status === "queued"
              ? "No tasks waiting. Ping Travis or drop one in."
              : status === "claimed"
                ? "Nothing in flight."
                : "Nothing completed yet."}
          </p>
        )}
        {tasks.map((t) => (
          <TaskCard key={t.relativePath} task={t} uri={taskUris[t.relativePath]} />
        ))}
      </CardBody>
    </Card>
  );
}

function TaskCard({ task, uri }: { task: Task; uri: string | undefined }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 p-2.5 space-y-1.5">
      <div className="text-sm text-foreground leading-snug">{task.title}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${AGENT_STYLE[task.agent]}`}
        >
          {task.agent}
        </span>
        {task.refTodoId !== null && (
          <span className="text-[10px] text-muted/70">ref #{task.refTodoId}</span>
        )}
        <span className="text-[10px] text-muted ml-auto">
          {formatRelativeTime(task.created)}
        </span>
        {uri && (
          <a
            href={uri}
            className="text-[10px] text-muted hover:text-foreground"
          >
            Edit ↗
          </a>
        )}
      </div>
    </div>
  );
}
