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
export type TaskAgent = "travis" | "claude-code" | "claude-cowork" | "brad";

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
  status: string | null;
  statusTone: "active" | "planning" | "shelved" | "unknown";
  type: string | null;
  nextAction: string | null;
  repoUrl: string | null;
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

export type SessionSource = "claude-code" | "openclaw";

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

// Calendar
export type CalendarEventFlag = "all-day" | "recurring" | "informational";
export type CalendarGroup = "this-week" | "next-week" | "later";

export type CalendarEvent = {
  dayLabel: string;
  timeRange: string | null;
  title: string;
  flags: CalendarEventFlag[];
  project: {
    target: string;
    display: string;
  } | null;
  tags: string[];
  group: CalendarGroup;
  raw: string;
};

export type CalendarSnapshot = {
  lastRefreshed: string | null;
  source: string | null;
  thisWeek: CalendarEvent[];
  nextWeek: CalendarEvent[];
  later: CalendarEvent[];
  total: number;
  exists: boolean;
};

// Network feeds
export type NetworkFeed = {
  filename: string;
  path: string;
  mtime: Date;
  data: unknown;
};

// Agents
export type AgentField = {
  label: string;
  value: string;
  isPlaceholder: boolean;
};

export type AgentEntry = {
  name: string;
  slug: string;
  fields: AgentField[];
  body: string;
  hasPlaceholder: boolean;
};

export type AgentsSnapshot = {
  mission: {
    body: string;
    hasPlaceholder: boolean;
  };
  roster: AgentEntry[];
  routing: string | null;
  exists: boolean;
  relativePath: string;
};

// Current State
export type ThisWeekFocusItem = {
  text: string;
  group: string | null;
};

export type CurrentStateSnapshot = {
  thisWeek: ThisWeekFocusItem[];
  immediateActions: string[];
  openQuestions: string[];
  sponsorsRaw: string;
  recentDecisions: string[];
  raw: string;
};

// YouTube
export type YoutubeSponsor = {
  name: string;
  totalUsd: number | null;
  paidUsd: number | null;
  notes: string | null;
};

export type YoutubeVideo = {
  folderName: string;
  archived: boolean;
  title: string;
  status: string | null;
  statusTone: "in-progress" | "paused" | "published";
  targetPublish: string | null;
  lastUpdated: string | null;
  repoUrl: string | null;
  sponsor: YoutubeSponsor | null;
  phases: { label: string; done: boolean }[];
  completedPhases: number;
  totalPhases: number;
};

export type YoutubeRecentUpload = {
  videoId: string;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  url: string;
};

export type YoutubeRecentSnapshot = {
  generatedAt: string | null;
  count: number;
  videos: YoutubeRecentUpload[];
};
