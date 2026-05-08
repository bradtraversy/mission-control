# Architecture

Mission Control is a Next.js app whose database is your filesystem. There is no DB layer, no ORM, no cache server — every request reads markdown off disk, parses YAML frontmatter, and renders. The only writes are five narrow operations, each landing as a markdown file Obsidian could have written.

## Big picture

```
                        ┌────────────────────────────┐
                        │    Obsidian vault (disk)   │
                        │   markdown + JSON files    │
                        └────────────┬───────────────┘
                                     │ read/write
                                     ▼
   ┌────────────┐  parsers/  ┌──────────────────┐  writers/  ┌────────────┐
   │  RSC pages │ ◀──────────│  src/lib (server)│───────────▶│ filesystem │
   └────────────┘            └────────┬─────────┘            └────────────┘
                                      │
                          chokidar    │  SSE  /api/events
                                      ▼
                        ┌────────────────────────┐
                        │  client (browser)      │
                        │  router.refresh() on   │
                        │  relevant change       │
                        └────────────────────────┘
```

## `src/lib/` — the server-only data layer

This is where every parser, writer, and vault helper lives. None of it should be imported from a client component.

### `vault.ts` — the only thing that touches the filesystem

- `resolveVaultPath()` — reads `VAULT_PATH`, expands `~`, resolves to absolute. Cached.
- `resolveVaultRelativePath(rel)` — joins a vault-relative path onto the root.
- `readMarkdown(rel)` — reads + parses YAML frontmatter via `gray-matter`. Returns `{frontmatter, body, raw, mtime, ...}`.
- `listMarkdown(dir, opts)` — recursively read a directory of markdown, skipping the excluded set.
- `isExcluded(path)` — guard used by the watcher and listMarkdown.
- `buildObsidianUri(rel)` — produces an `obsidian://` link so "Edit in Obsidian" buttons can deep-link the user back into their vault.

Every other module goes through these — no direct `fs` calls outside `vault.ts` and a couple of writers.

### `parsers/` — read side, one parser per concept

Each parser owns a vault path and returns a typed snapshot. They're independent — adding a new panel means adding one parser, no shared mutable state.

| Parser              | Vault path                          | What it returns                                  |
| ------------------- | ----------------------------------- | ------------------------------------------------ |
| `todos.ts`          | `Todos/Now.md` `Soon.md` `Later.md` | three columns + `nextId` for new todos           |
| `tasks.ts`          | `Tasks/*.md`, `Tasks/_control.json` | active tasks + pause flag                        |
| `projects.ts`       | `Core/Context/Projects.md`          | structured project list                          |
| `currentState.ts`   | `Core/Context/Current State.md`     | this-week / decisions / questions / sponsors raw |
| `sessions.ts`       | `Core/Sessions/{Claude,OpenClaw}/`  | session log index, newest-first                  |
| `digests.ts`        | `Research/Digests/`                 | digest list                                      |
| `youtubeIdeas.ts`   | `Research/YouTube/`                 | idea notes by status                             |
| `youtube.ts`        | `Network/data/youtube-recent.json`  | recent uploads feed                              |
| `sponsors.ts`       | `Business/Sponsors/<slug>.md`       | per-sponsor + aggregate totals                   |
| `network.ts`        | `Network/data/*.json`               | service / disk / connectivity / cron snapshots   |
| `networkFeeds.ts`   | `Network/data/`                     | raw feed file index for diagnostics              |
| `health.ts`         | `Network/data/*-health.json`        | rolled-up health for the home dashboard          |
| `calendar.ts`       | `Calendar/Upcoming.md`              | today + upcoming events                          |
| `daily.ts`          | `Core/Context/Current State.md`     | today's focus widget                             |
| `agents.ts`         | `Core/Context/Agents.md`            | optional agent registry                          |
| `github.ts`         | GitHub API (not vault)              | recent activity for the GitHub tab               |

GitHub is the only parser that calls a network API; it's gated by `GITHUB_TOKEN` and silently returns an unconfigured snapshot if the env vars aren't set.

### `writers/` — the entire write surface

Mission Control writes to disk in exactly these places:

| Writer                           | Operation                              |
| -------------------------------- | -------------------------------------- |
| `writers/todos.ts`               | check off a todo, move between columns, add new todo |
| `writers/tasks.ts`               | change task status, add new task, toggle `_control.json` paused |
| `writers/sponsors.ts`            | mark a sponsor payment row as paid     |
| `writers/youtubeIdeas.ts`        | bump idea status (idea → drafted → …)  |

Each writer reads the file, mutates the content in-memory, and writes back atomically via a `.tmp-{pid}` rename. Filenames and slugs are validated with strict regexes before any path gets joined onto the vault root.

If you want to add a new write, you add a new writer + an API route — there is no generic "save anything" path.

### `watcher.ts` — chokidar, server-side

Watches the vault root, debounces ~100ms, and broadcasts a typed event per change. SSE clients subscribe and call `router.refresh()` for relevant paths. High-frequency status feeds (`Network/data/`, `state/`) are flagged "refresh-irrelevant" — still readable, just don't re-render the page on every cron tick.

### `activity.ts` — the live activity rail

Maps every kind of vault change ("Tasks/*.md modified", "Core/Sessions/Claude/*.md added", etc.) to a typed activity event with a label and an Obsidian deep-link.

## `src/app/` — Next.js App Router

- **Server components by default.** Every page is RSC unless it needs interactivity. Data is fetched directly via parser functions — no `fetch('/api/...')` round-trip.
- **Client components** opt in with `'use client'` only where they need state, refs, or browser APIs (the toggle pause button, the search palette, the live activity rail subscriber).
- **API routes** under `app/api/` are the write API:
  - `POST /api/todos` — add new todo
  - `PATCH /api/todos/:id` — check off / move column
  - `POST /api/tasks` — add new task
  - `PATCH /api/tasks/:filename` — change status
  - `DELETE /api/tasks/:filename` — drop a task
  - `POST /api/control` — toggle pause
  - `PATCH /api/sponsors/...` — payment ops
  - `PATCH /api/youtube-ideas/:filename` — status bump
  - `GET /api/events` — SSE endpoint for live updates

All write routes validate input (status enums, integer IDs, slug regex) before calling a writer.

## Live updates flow

```
1. user (or Obsidian, or an agent) edits Tasks/2026-05-08-foo.md on disk
2. chokidar fires "change" → debounced → activity.ts builds a typed event
3. /api/events broadcasts the event via SSE
4. browser receives it, decides whether to refresh (refresh-irrelevant paths skip)
5. router.refresh() re-renders the relevant RSC tree, parsers re-read disk
```

There is no client-side cache to invalidate. The cache *is* the file's mtime, and Next handles that for us.

## Why no DB

- The vault was already the database before Mission Control existed.
- Anything Mission Control writes, you can write by hand. No hidden state.
- Migrations don't exist — schema changes are markdown frontmatter changes.
- Backups, sync, history, search are already solved by Obsidian + Git.

The cost is that every request hits disk. For a single-user, local-network app reading a few hundred markdown files, that's a non-issue.

## Where to make changes

- **New panel showing existing data** → add a Server Component, call existing parsers.
- **New parsed concept** → add `parsers/<name>.ts`, export from `lib/index.ts`, surface in a page.
- **New write** → add a writer + an API route. Validate inputs aggressively at the route boundary.
- **New activity event** → add an entry in `activity.ts`.

The five existing writes are the model: small, validated, atomic, vault-shaped.
