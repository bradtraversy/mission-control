import fs from "node:fs/promises";
import matter from "gray-matter";
import { resolveVaultRelativePath } from "../vault";
import type { TodoColumn, TodoItem, TodosSnapshot } from "../types";

const COLUMNS: TodoColumn[] = ["now", "soon", "later"];

const FILE_MAP: Record<TodoColumn, string> = {
  now: "Todos/Now.md",
  soon: "Todos/Soon.md",
  later: "Todos/Later.md",
};

const TODO_LINE_RE = /^- \[(?<box>[ x])\] `#(?<id>\d+)` (?<rest>.*)$/;
const COMPLETED_DATE_RE = / ✅ (\d{4}-\d{2}-\d{2})/;
const TAG_RE = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;

function parseLine(raw: string, column: TodoColumn): TodoItem | null {
  const match = raw.match(TODO_LINE_RE);
  if (!match?.groups) return null;
  const done = match.groups.box === "x";
  const id = Number.parseInt(match.groups.id, 10);
  let rest = match.groups.rest;
  let completedDate: string | null = null;
  const dateMatch = rest.match(COMPLETED_DATE_RE);
  if (dateMatch) {
    completedDate = dateMatch[1];
    rest = rest.replace(COMPLETED_DATE_RE, "");
  }
  const tags: string[] = [];
  rest = rest
    .replace(TAG_RE, (_, t) => {
      tags.push(t);
      return "";
    })
    .trimEnd();
  return {
    id,
    column,
    text: rest.trim(),
    done,
    completedDate,
    tags,
    raw,
  };
}

async function readColumn(column: TodoColumn): Promise<TodoItem[]> {
  try {
    const abs = resolveVaultRelativePath(FILE_MAP[column]);
    const raw = await fs.readFile(abs, "utf-8");
    const { content } = matter(raw);
    return content
      .split(/\r?\n/)
      .map((line) => parseLine(line, column))
      .filter((item): item is TodoItem => item !== null);
  } catch {
    return [];
  }
}

export async function getTodos(): Promise<TodosSnapshot> {
  const [now, soon, later] = await Promise.all(COLUMNS.map(readColumn));
  const allIds = [...now, ...soon, ...later].map((t) => t.id);
  const nextId = (allIds.length ? Math.max(...allIds) : 0) + 1;
  return { now, soon, later, nextId };
}
