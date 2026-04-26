import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { resolveVaultRelativePath, toRelativePath } from "../vault";
import type {
  Task,
  TaskAgent,
  TaskControl,
  TaskStatus,
  TodoColumn,
} from "../types";

const STATUSES: ReadonlySet<TaskStatus> = new Set(["queued", "claimed", "done"]);
const AGENTS: ReadonlySet<TaskAgent> = new Set([
  "travis",
  "claude-code",
  "claude-cowork",
  "brad",
]);
const REF_RE = /(?:^|\s)Ref:\s*(Now|Soon|Later)#(\d+)/im;

function firstHeading(body: string): string | null {
  const match = body.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : null;
}

function deriveTitle(body: string, filename: string): string {
  return (
    firstHeading(body) ??
    filename
      .replace(/\.md$/, "")
      .replace(/^\d{4}-\d{2}-\d{2}-/, "")
      .replace(/-/g, " ")
  );
}

function coerceStatus(value: unknown): TaskStatus {
  return STATUSES.has(value as TaskStatus) ? (value as TaskStatus) : "queued";
}

function coerceAgent(value: unknown): TaskAgent {
  return AGENTS.has(value as TaskAgent) ? (value as TaskAgent) : "brad";
}

async function parseTaskFile(
  absolute: string,
  archived: boolean,
): Promise<Task | null> {
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const filename = path.basename(absolute);
    const refMatch = parsed.content.match(REF_RE);
    const created =
      typeof fm.created === "string" && !Number.isNaN(Date.parse(fm.created))
        ? new Date(fm.created)
        : null;
    return {
      filename,
      relativePath: toRelativePath(absolute),
      title: deriveTitle(parsed.content, filename),
      created,
      status: coerceStatus(fm.status),
      agent: coerceAgent(fm.agent),
      body: parsed.content,
      refTodo: refMatch
        ? {
            column: refMatch[1].toLowerCase() as TodoColumn,
            id: Number.parseInt(refMatch[2], 10),
          }
        : null,
      archived,
    };
  } catch (err) {
    console.error(`vault: failed to parse task ${absolute}:`, err);
    return null;
  }
}

export async function getTasks(
  opts: { includeArchived?: boolean } = {},
): Promise<Task[]> {
  const tasksDir = resolveVaultRelativePath("Tasks");
  let entries;
  try {
    entries = await fs.readdir(tasksDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const activeFiles = entries
    .filter(
      (e) => e.isFile() && e.name.endsWith(".md") && e.name !== "README.md",
    )
    .map((e) => ({ absolute: path.join(tasksDir, e.name), archived: false }));

  const archivedFiles: { absolute: string; archived: boolean }[] = [];
  if (opts.includeArchived) {
    const archiveDir = path.join(tasksDir, "archive");
    try {
      const months = await fs.readdir(archiveDir, { withFileTypes: true });
      for (const month of months) {
        if (!month.isDirectory()) continue;
        const monthDir = path.join(archiveDir, month.name);
        const monthFiles = await fs.readdir(monthDir);
        for (const name of monthFiles) {
          if (name.endsWith(".md")) {
            archivedFiles.push({
              absolute: path.join(monthDir, name),
              archived: true,
            });
          }
        }
      }
    } catch {
      // archive dir may not exist yet
    }
  }

  const parsed = await Promise.all(
    [...activeFiles, ...archivedFiles].map(({ absolute, archived }) =>
      parseTaskFile(absolute, archived),
    ),
  );
  const tasks = parsed.filter((t): t is Task => t !== null);
  return tasks.sort((a, b) => {
    const aT = a.created?.getTime() ?? 0;
    const bT = b.created?.getTime() ?? 0;
    return bT - aT;
  });
}

export type TaskThroughput = {
  agent: TaskAgent;
  days: number[];
  total: number;
  todayCount: number;
};

// Bucket completed tasks (status === "done") by day per agent over a rolling
// window ending at `anchor`. Returns one entry per agent that has any done
// tasks in the window, plus zero-filled day arrays so the sparkline shows
// cadence rather than just non-zero days.
export function aggregateTaskThroughput(
  tasks: Task[],
  windowDays: number = 7,
  anchor: Date = new Date(),
): TaskThroughput[] {
  const dayKeys: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      anchor.getDate() - i,
    );
    dayKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const todayKey = dayKeys[dayKeys.length - 1];
  const dayIndex = new Map(dayKeys.map((k, i) => [k, i]));

  const byAgent = new Map<TaskAgent, number[]>();
  for (const t of tasks) {
    if (t.status !== "done" || !t.created) continue;
    const d = t.created;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const idx = dayIndex.get(key);
    if (idx === undefined) continue;
    if (!byAgent.has(t.agent)) {
      byAgent.set(t.agent, new Array(windowDays).fill(0));
    }
    const row = byAgent.get(t.agent)!;
    row[idx] += 1;
  }

  const result: TaskThroughput[] = [];
  for (const [agent, days] of byAgent.entries()) {
    const total = days.reduce((s, n) => s + n, 0);
    const todayCount = days[dayIndex.get(todayKey) ?? days.length - 1] ?? 0;
    result.push({ agent, days, total, todayCount });
  }
  result.sort((a, b) => b.total - a.total);
  return result;
}

export async function getTaskControl(): Promise<TaskControl> {
  const controlPath = resolveVaultRelativePath("Tasks/_control.json");
  try {
    const raw = await fs.readFile(controlPath, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      paused: Boolean(data.paused),
      pausedAt: typeof data.paused_at === "string" ? data.paused_at : null,
      pausedBy: typeof data.paused_by === "string" ? data.paused_by : null,
      notes: typeof data.notes === "string" ? data.notes : undefined,
    };
  } catch {
    return { paused: false, pausedAt: null, pausedBy: null };
  }
}
