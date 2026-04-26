import { TasksBoard } from "@/components/tasks/TasksBoard";
import { TaskThroughputSparklines } from "@/components/tasks/TaskThroughputSparklines";
import {
  aggregateTaskThroughput,
  buildObsidianUri,
  getTaskControl,
  getTasks,
} from "@/lib";

const WINDOW_DAYS = 7;

export default async function Page() {
  const [tasks, control] = await Promise.all([
    getTasks({ includeArchived: true }),
    getTaskControl(),
  ]);
  const taskUris = Object.fromEntries(
    tasks.map((t) => [t.relativePath, buildObsidianUri(t.relativePath)]),
  );
  const active = tasks.filter((t) => !t.archived);
  const throughput = aggregateTaskThroughput(tasks, WINDOW_DAYS);

  return (
    <div className="p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Tasks</h1>
        <p className="text-[14px] text-muted">
          Short-term quick queue over Tasks/*.md · {active.length}{" "}
          {active.length === 1 ? "task" : "tasks"} · Travis&apos;s heartbeat
          pulls from here
        </p>
      </header>
      {control.paused && <PausedBanner />}
      <TaskThroughputSparklines rows={throughput} windowDays={WINDOW_DAYS} />
      <TasksBoard tasks={active} taskUris={taskUris} />
    </div>
  );
}

function PausedBanner() {
  return (
    <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[14px] text-amber-200">
      <span className="font-medium">Paused.</span>{" "}
      Agents will not pull new tasks from this queue until Pause is toggled off.
    </div>
  );
}
