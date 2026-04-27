export type ActivityKind =
  | "task"
  | "todo"
  | "session-claude"
  | "session-openclaw"
  | "sponsor"
  | "youtube"
  | "calendar"
  | "research"
  | "network"
  | "context"
  | "memory"
  | "other";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  label: string;
  href: string | null;
  path: string;
  at: number;
};

type ClassifyRule = {
  match: (path: string) => boolean;
  kind: ActivityKind;
  toLabel: (path: string) => string;
  toHref: (path: string) => string | null;
};

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function stripDatePrefix(name: string): string {
  return name.replace(/^\d{4}-\d{2}-\d{2}-?/, "").replace(/\.md$/, "");
}

const RULES: ClassifyRule[] = [
  {
    match: (p) => p === "Tasks/_control.json",
    kind: "task",
    toLabel: () => "pause toggled",
    toHref: () => "/tasks",
  },
  {
    match: (p) => p.startsWith("Tasks/") && p.endsWith(".md"),
    kind: "task",
    toLabel: (p) => `task · ${stripDatePrefix(basename(p)) || basename(p)}`,
    toHref: () => "/tasks",
  },
  {
    match: (p) => p.startsWith("Todos/") && p.endsWith(".md"),
    kind: "todo",
    toLabel: (p) => `todo · ${basename(p).replace(/\.md$/, "")}`,
    toHref: () => "/todos",
  },
  {
    match: (p) => p.startsWith("Core/Sessions/Claude/") && p.endsWith(".md"),
    kind: "session-claude",
    toLabel: (p) =>
      `claude session · ${stripDatePrefix(basename(p)) || basename(p)}`,
    toHref: () => "/sessions",
  },
  {
    match: (p) => p.startsWith("Core/Sessions/OpenClaw/") && p.endsWith(".md"),
    kind: "session-openclaw",
    toLabel: (p) =>
      `openclaw session · ${stripDatePrefix(basename(p)) || basename(p)}`,
    toHref: () => "/sessions",
  },
  {
    match: (p) => p.startsWith("Business/Sponsors/") && p.endsWith(".md"),
    kind: "sponsor",
    toLabel: (p) => `sponsor · ${basename(p).replace(/\.md$/, "")}`,
    toHref: () => "/sponsors",
  },
  {
    match: (p) => p.startsWith("YouTube/") && p.endsWith(".md"),
    kind: "youtube",
    toLabel: (p) => {
      const segs = p.split("/");
      return `youtube · ${segs[1] ?? basename(p)}`;
    },
    toHref: () => "/youtube",
  },
  {
    match: (p) => p.startsWith("Calendar/"),
    kind: "calendar",
    toLabel: (p) => `calendar · ${basename(p).replace(/\.md$/, "")}`,
    toHref: () => "/calendar",
  },
  {
    match: (p) => p.startsWith("Research/Digests/") && p.endsWith(".md"),
    kind: "research",
    toLabel: (p) => `digest · ${stripDatePrefix(basename(p)) || basename(p)}`,
    toHref: () => "/research",
  },
  {
    match: (p) => p.startsWith("Research/") && p.endsWith(".md"),
    kind: "research",
    toLabel: (p) => `research · ${basename(p).replace(/\.md$/, "")}`,
    toHref: () => "/research",
  },
  {
    match: (p) => p.startsWith("Network/data/") || p.startsWith("Network/"),
    kind: "network",
    toLabel: (p) => `network · ${basename(p)}`,
    toHref: () => "/network",
  },
  {
    match: (p) => p.startsWith("Core/Context/") && p.endsWith(".md"),
    kind: "context",
    toLabel: (p) => `context · ${basename(p).replace(/\.md$/, "")}`,
    toHref: () => null,
  },
  {
    match: (p) => p.startsWith("memory/") && p.endsWith(".md"),
    kind: "memory",
    toLabel: (p) => `memory · ${basename(p).replace(/\.md$/, "")}`,
    toHref: () => null,
  },
];

export function classifyPath(path: string, at: number): ActivityEntry | null {
  for (const rule of RULES) {
    if (!rule.match(path)) continue;
    return {
      id: `${path}::${at}`,
      kind: rule.kind,
      label: rule.toLabel(path),
      href: rule.toHref(path),
      path,
      at,
    };
  }
  // Generic fallback only for human-meaningful paths; skip everything else
  // (config/state files, dotfiles, etc.) so the feed stays readable.
  return null;
}

export function classifyPaths(paths: string[], at: number): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  const seen = new Set<string>();
  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    const e = classifyPath(p, at);
    if (e) entries.push(e);
  }
  return entries;
}
