import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { TodoItem } from "@/lib";

type Props = {
  todos: TodoItem[];
};

export function TodosNowPanel({ todos }: Props) {
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <Card>
      <CardHeader
        title="Todos · Now"
        meta={`${open.length} open · ${done.length} done`}
        action={
          <Link
            href="/todos"
            className="text-[12px] text-muted hover:text-foreground"
          >
            View →
          </Link>
        }
      />
      <CardBody className="space-y-0.5">
        {open.map((t) => (
          <TodoRow key={t.id} todo={t} />
        ))}
        {done.length > 0 && (
          <>
            <div className="pt-2 mt-1 border-t border-border text-[11px] uppercase tracking-wider text-muted/50">
              Done
            </div>
            {done.map((t) => (
              <TodoRow key={t.id} todo={t} />
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
      <span className="text-[12px] text-muted/60 font-mono tabular-nums shrink-0 mt-0.5">
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
              className="text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
