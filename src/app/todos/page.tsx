import { TodosBoard } from "@/components/todos/TodosBoard";
import { buildObsidianUri, getTodos } from "@/lib";

export default async function Page() {
  const snapshot = await getTodos();
  const columnUris = {
    now: buildObsidianUri("Todos/Now.md"),
    soon: buildObsidianUri("Todos/Soon.md"),
    later: buildObsidianUri("Todos/Later.md"),
  };

  const openCount =
    snapshot.now.filter((t) => !t.done).length +
    snapshot.soon.filter((t) => !t.done).length +
    snapshot.later.filter((t) => !t.done).length;

  return (
    <div className="p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-lg font-medium tracking-tight">Todos</h1>
        <p className="text-[12px] text-muted">
          Brad&apos;s curated long-term backlog · {openCount} open across three
          columns · IDs preserved from the vault
        </p>
      </header>
      <TodosBoard snapshot={snapshot} columnUris={columnUris} />
    </div>
  );
}
