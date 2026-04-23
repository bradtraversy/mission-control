"use client";

import { useMemo, useState } from "react";
import type { TodoColumn, TodoItem, TodosSnapshot } from "@/lib";
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
          />
        ))}
      </div>
    </div>
  );
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
}: {
  column: TodoColumn;
  items: TodoItem[];
  editUri: string;
}) {
  const open = items.filter((t) => !t.done);
  const done = items.filter((t) => t.done);

  return (
    <Card>
      <CardHeader
        title={`${COLUMN_LABELS[column]} · ${COLUMN_HINTS[column]}`}
        meta={`${open.length} open · ${done.length} done`}
        action={
          <a
            href={editUri}
            className="text-[11px] text-muted hover:text-foreground"
          >
            Edit ↗
          </a>
        }
      />
      <CardBody className="space-y-0.5">
        {open.length === 0 && done.length === 0 && (
          <p className="text-[11px] text-muted/60 italic py-1">
            No todos match this filter.
          </p>
        )}
        {open.map((t) => (
          <TodoRow key={`${t.column}-${t.id}`} todo={t} />
        ))}
        {done.length > 0 && (
          <>
            <div className="pt-2 mt-1 border-t border-border text-[10px] uppercase tracking-wider text-muted/50">
              Done
            </div>
            {done.map((t) => (
              <TodoRow key={`${t.column}-${t.id}`} todo={t} />
            ))}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function TodoRow({ todo }: { todo: TodoItem }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span
        className={`mt-0.5 inline-block w-3.5 h-3.5 rounded-[3px] border shrink-0 ${
          todo.done
            ? "bg-emerald-400/25 border-emerald-400/50"
            : "border-border"
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
