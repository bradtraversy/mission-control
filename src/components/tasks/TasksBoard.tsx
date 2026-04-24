"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/format";
import type { Task, TaskAgent, TaskStatus } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";

type Props = {
  tasks: Task[];
  taskUris: Record<string, string>;
};

const STATUSES: TaskStatus[] = ["queued", "claimed", "done"];
const AGENT_FILTERS: (TaskAgent | "all")[] = [
  "all",
  "travis",
  "claude-code",
  "claude-cowork",
  "brad",
];

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
  "claude-code": "bg-emerald-400/15 text-emerald-300",
  "claude-cowork": "bg-sky-400/15 text-sky-300",
  brad: "bg-surface-2 text-foreground",
};

const AGENT_LABEL: Record<TaskAgent | "all", string> = {
  all: "All",
  travis: "Travis",
  "claude-code": "Claude Code",
  "claude-cowork": "Claude Cowork",
  brad: "Brad",
};

export function TasksBoard({ tasks, taskUris }: Props) {
  const [agentFilter, setAgentFilter] = useState<TaskAgent | "all">("all");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAgent, setDraftAgent] = useState<TaskAgent>("travis");
  const [draftBody, setDraftBody] = useState("");

  const resetDraft = () => {
    setDraftTitle("");
    setDraftBody("");
    setAdding(false);
  };

  const submitNew = () => {
    if (!draftTitle.trim()) return;
    startTransition(async () => {
      const payload: { title: string; agent: TaskAgent; body?: string } = {
        title: draftTitle,
        agent: draftAgent,
      };
      const trimmedBody = draftBody.trim();
      if (trimmedBody) payload.body = trimmedBody;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({ error: "write failed" }))) as {
          error?: string;
        };
        alert(`Failed to add task: ${error ?? "unknown error"}`);
        return;
      }
      resetDraft();
      router.refresh();
    });
  };

  const setStatus = (task: Task, status: TaskStatus) => {
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.filename)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({ error: "write failed" }))) as {
          error?: string;
        };
        alert(`Failed to update ${task.filename}: ${error ?? "unknown error"}`);
        return;
      }
      router.refresh();
    });
  };

  const deleteTask = (task: Task) => {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({ error: "delete failed" }))) as {
          error?: string;
        };
        alert(`Failed to delete ${task.filename}: ${error ?? "unknown error"}`);
        return;
      }
      router.refresh();
    });
  };

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
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="ml-auto text-[11px] px-2 py-1 rounded border border-border bg-surface-2/60 text-muted hover:text-foreground"
        >
          {adding ? "Cancel" : "+ New Task"}
        </button>
      </div>
      {adding && (
        <div className="rounded-md border border-border bg-surface/60 p-3 space-y-2">
          <input
            autoFocus
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNew();
              } else if (e.key === "Escape") {
                resetDraft();
              }
            }}
            disabled={isPending}
            placeholder="Task title"
            className="w-full text-sm bg-surface-2/60 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60"
          />
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitNew();
              } else if (e.key === "Escape") {
                resetDraft();
              }
            }}
            disabled={isPending}
            rows={4}
            placeholder="Body (optional) — what should the agent do? Markdown ok."
            className="w-full text-sm bg-surface-2/60 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60 resize-y font-mono"
          />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted">Assign to</label>
            <select
              value={draftAgent}
              onChange={(e) => setDraftAgent(e.target.value as TaskAgent)}
              disabled={isPending}
              className="text-[12px] bg-surface-2/60 border border-border rounded px-1.5 py-1 text-foreground focus:outline-none focus:border-accent/60"
            >
              <option value="travis">Travis</option>
              <option value="claude-code">Claude Code</option>
              <option value="claude-cowork">Claude Cowork</option>
              <option value="brad">Brad</option>
            </select>
            <button
              type="button"
              onClick={submitNew}
              disabled={isPending || !draftTitle.trim()}
              className="ml-auto text-[11px] px-2.5 py-1 rounded bg-accent/20 border border-accent/40 text-foreground hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
          <p className="text-[10px] text-muted/50">
            Title + optional body assigned to the chosen agent · Enter (in title) or ⌘/Ctrl+Enter (in body) to create · Esc to cancel
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byStatus[status]}
            taskUris={taskUris}
            onSetStatus={setStatus}
            onDelete={deleteTask}
            disabled={isPending}
          />
        ))}
      </div>
    </div>
  );
}

function prevStatus(s: TaskStatus): TaskStatus | null {
  const i = STATUSES.indexOf(s);
  return i > 0 ? STATUSES[i - 1] : null;
}
function nextStatus(s: TaskStatus): TaskStatus | null {
  const i = STATUSES.indexOf(s);
  return i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
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
  onSetStatus,
  onDelete,
  disabled,
}: {
  status: TaskStatus;
  tasks: Task[];
  taskUris: Record<string, string>;
  onSetStatus: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
  disabled: boolean;
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
          <TaskCard
            key={t.relativePath}
            task={t}
            uri={taskUris[t.relativePath]}
            onSetStatus={onSetStatus}
            onDelete={onDelete}
            disabled={disabled}
          />
        ))}
      </CardBody>
    </Card>
  );
}

function stripFirstH1(body: string): string {
  return body.replace(/^#\s+.+?\n+/, "").trimStart();
}

function TaskCard({
  task,
  uri,
  onSetStatus,
  onDelete,
  disabled,
}: {
  task: Task;
  uri: string | undefined;
  onSetStatus: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const prev = prevStatus(task.status);
  const next = nextStatus(task.status);
  const bodyForDisplay = stripFirstH1(task.body);
  const hasBody = bodyForDisplay.length > 0;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="group rounded-md border border-border bg-surface-2/40 p-2.5 space-y-1.5">
      <div
        className="flex items-start gap-2 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <span
          className={`shrink-0 text-muted/60 text-[10px] leading-snug pt-0.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ▸
        </span>
        <div className="text-sm text-foreground leading-snug flex-1 min-w-0">
          {task.title}
        </div>
        <div
          className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={stop}
        >
          <StatusButton
            direction="left"
            target={prev}
            disabled={disabled || !prev}
            onClick={() => prev && onSetStatus(task, prev)}
          />
          <StatusButton
            direction="right"
            target={next}
            disabled={disabled || !next}
            onClick={() => next && onSetStatus(task, next)}
          />
          <button
            type="button"
            onClick={() => onDelete(task)}
            disabled={disabled}
            title="Delete task"
            aria-label="Delete task"
            className="text-muted/60 hover:text-red-400 disabled:text-muted/20 disabled:cursor-not-allowed px-1 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${AGENT_STYLE[task.agent]}`}
        >
          {task.agent}
        </span>
        {task.refTodo && (
          <span className="text-[10px] text-muted/70">
            ref {task.refTodo.column[0].toUpperCase() + task.refTodo.column.slice(1)}#{task.refTodo.id}
          </span>
        )}
        <span className="text-[10px] text-muted ml-auto">
          {formatRelativeTime(task.created)}
        </span>
        {uri && (
          <a
            href={uri}
            onClick={stop}
            className="text-[10px] text-muted hover:text-foreground"
          >
            Edit ↗
          </a>
        )}
      </div>
      {expanded && (
        <div className="border-t border-border/60 pt-2 mt-1">
          {hasBody ? (
            <MarkdownBody content={bodyForDisplay} />
          ) : (
            <p className="text-[12px] text-muted/60 italic">
              (no body — task has just a title)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusButton({
  direction,
  target,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  target: TaskStatus | null;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={target ? `Move to ${target}` : ""}
      aria-label={target ? `Move to ${target}` : "no move available"}
      className="text-muted/60 hover:text-foreground disabled:text-muted/20 disabled:cursor-not-allowed px-1 text-xs leading-none"
    >
      {direction === "left" ? "←" : "→"}
    </button>
  );
}
