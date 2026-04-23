"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TodoColumn, TodoItem, TodosSnapshot } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type Props = {
  snapshot: TodosSnapshot;
  columnUris: Record<TodoColumn, string>;
};

const COLUMN_LABELS: Record<TodoColumn, string> = {
  now: "Now",
  soon: "Soon",
  later: "Later",
};

const COLUMN_HINTS: Record<TodoColumn, string> = {
  now: "Active work",
  soon: "Queued up next",
  later: "Someday / parked",
};

export function TodosBoard({ snapshot, columnUris }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const patchTodo = (todo: TodoItem, body: object, label: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/todos/${todo.column}/${todo.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({ error: "write failed" }))) as {
          error?: string;
        };
        alert(`Failed to ${label} #${todo.id}: ${error ?? "unknown error"}`);
        return;
      }
      router.refresh();
    });
  };

  const toggleDone = (todo: TodoItem) =>
    patchTodo(todo, { done: !todo.done }, "update");

  const moveTodoTo = (todo: TodoItem, to: TodoColumn) =>
    patchTodo(todo, { column: to }, `move to ${to}`);

  const addNew = (column: TodoColumn, input: string) => {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const res = await fetch(`/api/todos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ column, input }),
        });
        if (!res.ok) {
          const { error } = (await res.json().catch(() => ({ error: "write failed" }))) as {
            error?: string;
          };
          alert(`Failed to add todo: ${error ?? "unknown error"}`);
          resolve(false);
          return;
        }
        router.refresh();
        resolve(true);
      });
    });
  };

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const col of ["now", "soon", "later"] as TodoColumn[]) {
      for (const todo of snapshot[col]) {
        for (const tag of todo.tags) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [snapshot]);

  const filter = (items: TodoItem[]) =>
    activeTag ? items.filter((t) => t.tags.includes(activeTag)) : items;

  return (
    <div className="space-y-4">
      <FilterBar
        tags={allTags}
        active={activeTag}
        onChange={setActiveTag}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(["now", "soon", "later"] as TodoColumn[]).map((col) => (
          <Column
            key={col}
            column={col}
            items={filter(snapshot[col])}
            editUri={columnUris[col]}
            onToggle={toggleDone}
            onMove={moveTodoTo}
            onAdd={addNew}
            disabled={isPending}
          />
        ))}
      </div>
    </div>
  );
}

const COLUMN_ORDER: TodoColumn[] = ["now", "soon", "later"];
function prevColumn(c: TodoColumn): TodoColumn | null {
  const i = COLUMN_ORDER.indexOf(c);
  return i > 0 ? COLUMN_ORDER[i - 1] : null;
}
function nextColumnOf(c: TodoColumn): TodoColumn | null {
  const i = COLUMN_ORDER.indexOf(c);
  return i < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[i + 1] : null;
}

function FilterBar({
  tags,
  active,
  onChange,
}: {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Chip label="All" active={active === null} onClick={() => onChange(null)} />
      {tags.map((tag) => (
        <Chip
          key={tag}
          label={`#${tag}`}
          active={active === tag}
          onClick={() => onChange(active === tag ? null : tag)}
        />
      ))}
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
  column,
  items,
  editUri,
  onToggle,
  onMove,
  onAdd,
  disabled,
}: {
  column: TodoColumn;
  items: TodoItem[];
  editUri: string;
  onToggle: (todo: TodoItem) => void;
  onMove: (todo: TodoItem, to: TodoColumn) => void;
  onAdd: (column: TodoColumn, input: string) => Promise<boolean>;
  disabled: boolean;
}) {
  const open = items.filter((t) => !t.done);
  const done = items.filter((t) => t.done);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (!draft.trim()) return;
    const ok = await onAdd(column, draft);
    if (ok) {
      setDraft("");
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={`${COLUMN_LABELS[column]} · ${COLUMN_HINTS[column]}`}
        meta={`${open.length} open · ${done.length} done`}
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="text-[11px] text-muted hover:text-foreground"
            >
              {adding ? "Cancel" : "+ Add"}
            </button>
            <a
              href={editUri}
              className="text-[11px] text-muted hover:text-foreground"
            >
              Edit ↗
            </a>
          </div>
        }
      />
      {adding && (
        <div className="px-4 pb-3">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            disabled={disabled}
            placeholder="Type your todo, include #tags inline"
            className="w-full text-sm bg-surface-2/60 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60"
          />
          <p className="text-[10px] text-muted/50 mt-1">
            Enter to add · Esc to cancel · IDs assign automatically
          </p>
        </div>
      )}
      <CardBody className="space-y-0.5">
        {open.length === 0 && done.length === 0 && (
          <p className="text-[11px] text-muted/60 italic py-1">
            No todos match this filter.
          </p>
        )}
        {open.map((t) => (
          <TodoRow
            key={`${t.column}-${t.id}`}
            todo={t}
            onToggle={onToggle}
            onMove={onMove}
            disabled={disabled}
          />
        ))}
        {done.length > 0 && (
          <>
            <div className="pt-2 mt-1 border-t border-border text-[10px] uppercase tracking-wider text-muted/50">
              Done
            </div>
            {done.map((t) => (
              <TodoRow
                key={`${t.column}-${t.id}`}
                todo={t}
                onToggle={onToggle}
                disabled={disabled}
              />
            ))}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function TodoRow({
  todo,
  onToggle,
  onMove,
  disabled,
}: {
  todo: TodoItem;
  onToggle: (todo: TodoItem) => void;
  onMove?: (todo: TodoItem, to: TodoColumn) => void;
  disabled: boolean;
}) {
  const prev = prevColumn(todo.column);
  const next = nextColumnOf(todo.column);
  return (
    <div className="group flex items-start gap-2 py-1">
      <button
        type="button"
        onClick={() => onToggle(todo)}
        disabled={disabled}
        aria-label={todo.done ? `Mark #${todo.id} open` : `Mark #${todo.id} done`}
        className={`mt-0.5 inline-block w-3.5 h-3.5 rounded-[3px] border shrink-0 transition-colors cursor-pointer disabled:cursor-wait ${
          todo.done
            ? "bg-emerald-400/25 border-emerald-400/50 hover:bg-emerald-400/35"
            : "border-border hover:border-foreground/40"
        }`}
      />
      <span className="text-[11px] text-muted/60 font-mono tabular-nums shrink-0 mt-0.5">
        #{todo.id}
      </span>
      <span
        className={`text-sm flex-1 min-w-0 ${
          todo.done ? "line-through text-muted" : "text-foreground"
        }`}
      >
        {todo.text}
      </span>
      {onMove && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoveButton
            direction="left"
            target={prev}
            disabled={disabled || !prev}
            onClick={() => prev && onMove(todo, prev)}
          />
          <MoveButton
            direction="right"
            target={next}
            disabled={disabled || !next}
            onClick={() => next && onMove(todo, next)}
          />
        </div>
      )}
      {todo.tags.length > 0 && (
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          {todo.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MoveButton({
  direction,
  target,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  target: TodoColumn | null;
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
