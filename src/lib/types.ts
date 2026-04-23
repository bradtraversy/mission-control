export type Frontmatter = Record<string, unknown>;

export type ParsedMarkdown<T = Frontmatter> = {
  path: string;
  relativePath: string;
  frontmatter: T;
  body: string;
  raw: string;
  mtime: Date;
};

// Todos
export type TodoColumn = "now" | "soon" | "later";

export type TodoItem = {
  id: number;
  column: TodoColumn;
  text: string;
  done: boolean;
  completedDate: string | null;
  tags: string[];
  raw: string;
};

export type TodosSnapshot = {
  now: TodoItem[];
  soon: TodoItem[];
  later: TodoItem[];
  nextId: number;
};

// Tasks
export type TaskStatus = "queued" | "claimed" | "done";
export type TaskAgent = "travis" | "claude" | "brad";

export type Task = {
  filename: string;
  relativePath: string;
  title: string;
  created: Date | null;
  status: TaskStatus;
  agent: TaskAgent;
  body: string;
  refTodo: { column: TodoColumn; id: number } | null;
  archived: boolean;
};

export type TaskControl = {
  paused: boolean;
  pausedAt: string | null;
  pausedBy: string | null;
  notes?: string;
};

// Projects
export type Project = {
  slug: string;
  name: string;
  body: string;
  raw: string;
};

// Sessions
export type SessionFrontmatter = {
  type?: string;
  date?: string;
  time?: string;
  projects?: string[];
  topics?: string[];
  tool?: string;
  outcome?: string;
};

export type SessionSource = "claude" | "openclaw";

export type Session = ParsedMarkdown<SessionFrontmatter> & {
  source: SessionSource;
  slug: string;
  title: string;
  date: string | null;
};

// Digests
export type DigestFrontmatter = {
  date?: string;
  title?: string;
  topics?: string[];
  generated_by?: string;
};

export type Digest = ParsedMarkdown<DigestFrontmatter> & {
  date: string | null;
};

// Memory
export type MemoryEntry = ParsedMarkdown;

// Network feeds
export type NetworkFeed = {
  filename: string;
  path: string;
  mtime: Date;
  data: unknown;
};

// Current State
export type CurrentStateSnapshot = {
  thisWeek: string[];
  immediateActions: string[];
  openQuestions: string[];
  sponsorsRaw: string;
  recentDecisions: string[];
  raw: string;
};
