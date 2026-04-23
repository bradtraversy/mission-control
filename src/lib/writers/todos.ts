import fs from "node:fs/promises";
import path from "node:path";
import { resolveVaultRelativePath } from "../vault";
import type { TodoColumn } from "../types";

const FILE_MAP: Record<TodoColumn, string> = {
  now: "Todos/Now.md",
  soon: "Todos/Soon.md",
  later: "Todos/Later.md",
};

const COMPLETED_DATE_RE = / ✅ \d{4}-\d{2}-\d{2}/;

async function readFile(relative: string): Promise<string> {
  return fs.readFile(resolveVaultRelativePath(relative), "utf-8");
}

async function writeFileAtomic(relative: string, contents: string): Promise<void> {
  const abs = resolveVaultRelativePath(relative);
  const dir = path.dirname(abs);
  const tmp = path.join(dir, `.${path.basename(abs)}.tmp-${process.pid}`);
  await fs.writeFile(tmp, contents, "utf-8");
  await fs.rename(tmp, abs);
}

function todoLineRegex(id: number): RegExp {
  return new RegExp(`^- \\[[ x]\\] \`#${id}\` `);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function setTodoDone(
  column: TodoColumn,
  id: number,
  done: boolean,
): Promise<void> {
  const file = FILE_MAP[column];
  const raw = await readFile(file);
  const lines = raw.split(/\r?\n/);
  const re = todoLineRegex(id);
  let hit = false;

  const updated = lines.map((line) => {
    if (!re.test(line)) return line;
    hit = true;
    if (done) {
      let next = line.replace(/^- \[ \]/, "- [x]");
      if (!COMPLETED_DATE_RE.test(next)) {
        next = `${next} ✅ ${today()}`;
      }
      return next;
    }
    return line.replace(/^- \[x\]/, "- [ ]").replace(COMPLETED_DATE_RE, "");
  });

  if (!hit) {
    throw new Error(`Todo #${id} not found in ${file}`);
  }
  await writeFileAtomic(file, updated.join("\n"));
}
