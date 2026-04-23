import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import type { Frontmatter, ParsedMarkdown } from "./types";

const EXCLUDED_FILES = new Set([
  "CLAUDE.md",
  "AGENTS.md",
  "HEARTBEAT.md",
  "SOUL.md",
  "USER.md",
  "MEMORY.md",
  "TOOLS.md",
  "IDENTITY.md",
]);

const EXCLUDED_RELATIVE_FILES = new Set(["Core/Context/AI Rules.md"]);

let cachedVaultPath: string | null = null;

export function resolveVaultPath(): string {
  if (cachedVaultPath) return cachedVaultPath;
  const raw = process.env.VAULT_PATH;
  if (!raw) {
    throw new Error(
      "VAULT_PATH env var is required. Set it in .env.local or your shell.",
    );
  }
  const expanded = raw.startsWith("~")
    ? path.join(os.homedir(), raw.slice(1))
    : raw;
  cachedVaultPath = path.resolve(expanded);
  return cachedVaultPath;
}

export function resolveVaultRelativePath(relative: string): string {
  return path.join(resolveVaultPath(), relative);
}

export function toRelativePath(absolute: string): string {
  return path
    .relative(resolveVaultPath(), absolute)
    .split(path.sep)
    .join("/");
}

export function buildObsidianUri(relativePath: string): string {
  const vault = path.basename(resolveVaultPath());
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(relativePath)}`;
}

export function isExcluded(absoluteOrRelative: string): boolean {
  const root = resolveVaultPath();
  const rel = absoluteOrRelative.startsWith(root)
    ? path.relative(root, absoluteOrRelative).split(path.sep).join("/")
    : absoluteOrRelative.split(path.sep).join("/");
  const basename = path.basename(rel);
  if (basename.startsWith(".")) return true;
  if (rel.split("/").some((segment) => segment.startsWith("."))) return true;
  if (EXCLUDED_FILES.has(basename)) return true;
  if (EXCLUDED_RELATIVE_FILES.has(rel)) return true;
  return false;
}

export async function readMarkdown<T = Frontmatter>(
  relativePath: string,
): Promise<ParsedMarkdown<T>> {
  const absolute = resolveVaultRelativePath(relativePath);
  const [raw, stats] = await Promise.all([
    fs.readFile(absolute, "utf-8"),
    fs.stat(absolute),
  ]);
  const parsed = matter(raw);
  return {
    path: absolute,
    relativePath: toRelativePath(absolute),
    frontmatter: normalizeFrontmatter(parsed.data) as T,
    body: parsed.content,
    raw,
    mtime: stats.mtime,
  };
}

type ListOptions = {
  recursive?: boolean;
  includeExcluded?: boolean;
  filter?: (relativePath: string) => boolean;
};

export async function listMarkdown(
  relativeDir: string,
  opts: ListOptions = {},
): Promise<ParsedMarkdown[]> {
  const root = resolveVaultPath();
  const dir = path.join(root, relativeDir);
  const entries = await walk(dir, opts.recursive ?? false);
  const filtered = entries
    .filter((p) => p.endsWith(".md"))
    .filter((p) => opts.includeExcluded || !isExcluded(p))
    .filter((p) => !opts.filter || opts.filter(toRelativePath(p)));
  const results = await Promise.all(filtered.map(readOne));
  return results.filter((r): r is ParsedMarkdown => r !== null);
}

async function readOne(absolute: string): Promise<ParsedMarkdown | null> {
  try {
    const [raw, stats] = await Promise.all([
      fs.readFile(absolute, "utf-8"),
      fs.stat(absolute),
    ]);
    const parsed = matter(raw);
    return {
      path: absolute,
      relativePath: toRelativePath(absolute),
      frontmatter: normalizeFrontmatter(parsed.data) as Frontmatter,
      body: parsed.content,
      raw,
      mtime: stats.mtime,
    };
  } catch (err) {
    console.error(`vault: failed to read ${absolute}:`, err);
    return null;
  }
}

// gray-matter parses YAML dates into JS Date objects; round-trip through JSON
// to normalize them to ISO strings so downstream parsers can treat dates
// uniformly as strings.
function normalizeFrontmatter(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

async function walk(dir: string, recursive: boolean): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive && !entry.name.startsWith(".")) {
        files.push(...(await walk(full, true)));
      }
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}
