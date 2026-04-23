import fs from "node:fs/promises";
import path from "node:path";
import { resolveVaultRelativePath } from "../vault";
import type { TaskAgent, TaskStatus } from "../types";

const FILENAME_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Za-z0-9-]+\.md$/;

async function writeFileAtomic(absolute: string, contents: string): Promise<void> {
  const dir = path.dirname(absolute);
  const tmp = path.join(dir, `.${path.basename(absolute)}.tmp-${process.pid}`);
  await fs.writeFile(tmp, contents, "utf-8");
  await fs.rename(tmp, absolute);
}

function assertSafeFilename(filename: string): void {
  if (!FILENAME_RE.test(filename)) {
    throw new Error(`invalid task filename: ${filename}`);
  }
}

function resolveTaskFile(filename: string): string {
  assertSafeFilename(filename);
  return path.join(resolveVaultRelativePath("Tasks"), filename);
}

export async function setTaskStatus(
  filename: string,
  status: TaskStatus,
): Promise<void> {
  const abs = resolveTaskFile(filename);
  const raw = await fs.readFile(abs, "utf-8");
  const re = /^status:\s*.+$/m;
  if (!re.test(raw)) {
    throw new Error(`task ${filename} has no status frontmatter`);
  }
  const updated = raw.replace(re, `status: ${status}`);
  await writeFileAtomic(abs, updated);
}

export async function addTask(opts: {
  title: string;
  agent: TaskAgent;
  body?: string;
}): Promise<{ filename: string }> {
  const title = opts.title.trim();
  if (!title) throw new Error("title required");

  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const timePart = now.toISOString().slice(11, 16);
  const slug = slugify(title);
  const filename = await pickFilename(datePart, slug);
  const abs = resolveTaskFile(filename);

  const body = opts.body?.trim() ? `\n${opts.body.trim()}\n` : "";
  const contents =
    `---\n` +
    `type: task\n` +
    `created: ${datePart}T${timePart}\n` +
    `status: queued\n` +
    `agent: ${opts.agent}\n` +
    `---\n` +
    `# ${title}\n` +
    body;

  await writeFileAtomic(abs, contents);
  return { filename };
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "task";
}

async function pickFilename(date: string, slug: string): Promise<string> {
  const dir = resolveVaultRelativePath("Tasks");
  const base = `${date}-${slug}`;
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? `${base}.md` : `${base}-${i + 1}.md`;
    const abs = path.join(dir, candidate);
    try {
      await fs.access(abs);
    } catch {
      return candidate;
    }
  }
  throw new Error("could not find free filename slot");
}

export async function setPaused(paused: boolean): Promise<void> {
  const abs = resolveVaultRelativePath("Tasks/_control.json");
  let current: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(abs, "utf-8");
    current = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // fall through to defaults below
  }
  const next = {
    ...current,
    paused,
    paused_at: paused ? new Date().toISOString() : null,
    paused_by: paused ? "mission-control" : null,
  };
  await writeFileAtomic(abs, `${JSON.stringify(next, null, 2)}\n`);
}
