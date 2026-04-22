@AGENTS.md

# Mission Control

Brad's personal command center. Reads the Obsidian vault as its database. LAN-only, single-user, no auth. Part of Travx Labs.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 via `@tailwindcss/postcss` (tokens live in `src/app/globals.css` under `@theme` — no `tailwind.config.ts`)
- pnpm
- No database. The Obsidian vault at `$VAULT_PATH` is the data source.

## Commands

```
pnpm dev     # Turbopack dev server (port 3000 unless taken)
pnpm build   # production build
pnpm start   # prod server, reads PORT env
pnpm lint    # ESLint (flat config)
```

## Topology

```
trav-dev (dev) ──git push──► github.com/travxlabs/mission-control ──git pull──► trav-ai (prod :8890)
                                         ▲
                        ~/Documents/Traversy Lab/   (the vault, read by both sides)
```

Dev on trav-dev at `~/Code/mission-control`. Prod on trav-ai as a systemd-user service on port 8890, LAN-scoped to `192.168.4.0/22`. **No Docker.** Modeled on `travxlabs/network-dashboard`.

## Ownership split

- **Claude (trav-dev) owns the code.** All commits and pushes originate here.
- **Travis (trav-ai) owns data collection** — `Network/data/*.json` feeds, scheduled jobs, Calendar cache. Travis does **not** edit the repo; Travis runs `git pull && systemctl --user restart mission-control` after Claude pushes.

## Key conventions

- **Vault is the database.** Every read and write is a markdown file on disk. Parse YAML frontmatter with `gray-matter`.
- **Writes must be Obsidian-compatible** per `Core/Context/AI Rules.md` in the vault. No hidden state, no sidecar files that Brad wouldn't also write by hand.
- **Exclude these vault paths from generic parsing**: `CLAUDE.md`, `AGENTS.md`, `HEARTBEAT.md`, `SOUL.md`, `USER.md`, `MEMORY.md`, `TOOLS.md`, `IDENTITY.md`, `Core/Context/AI Rules.md`, `.claude/`, `.openclaw/`, `.obsidian/`, `.trash/`, any dotfile/dotdir.
- **Todos vs Tasks** — split by *time horizon*, not by human-vs-agent. Both Brad and agents write to both:
  - `Todos/` (existing) = long-term curated backlog. `Now.md` / `Soon.md` / `Later.md`, global `#N` IDs, brand tags. Unchanged format.
  - `Tasks/` (new) = short-term quick queue. One file per task: `YYYY-MM-DD-<slug>.md`. Frontmatter: `type | created | status | agent` only — no id, priority, project, or tags. Tags go in the body (`#vidpipe`, `#high`).
- **Task statuses**: `queued` → `claimed` → `done` (3 states). Done tasks auto-archive to `Tasks/archive/YYYY-MM/` after 7 days.
- **Agent routing** via the `agent` frontmatter field on `Tasks/*.md`:
  - `travis` — Travis's heartbeat on trav-ai picks up queued tasks. **Travis only reads `Tasks/`, never `Todos/`.**
  - `claude` — Claude sessions pick up queued tasks at `/resume` time.
  - `brad` — self-assigned; no agent claims these.
- **Ref-to-Todo**: a Task body can reference a Todo with `Ref: #N`. The completing agent flips the Task to `done` and also checks off `#N` in the matching Todo file.
- **Pause marker**: `Tasks/_control.json` with `{"paused": true}`. All agents must check this before pulling work.
- **Narrow write surface.** MC only writes five structured operations: (1) check off a todo, (2) move a todo between Now/Soon/Later, (3) add a new todo (next `#N`), (4) change a task's status, (5) add a new task. Toggle Pause also writes `Tasks/_control.json`. Anything else is read-only with an "Edit in Obsidian" button that opens the file via `obsidian://` URI.
- **Live updates**: chokidar watches the vault on the server side, SSE pushes change events to the browser. Debounce ~100ms.
- **Dark-first UI**, Linear-ish aesthetic. Palette tokens in `globals.css` `@theme`. System font stack, no web fonts by default.

## Next.js note

`params` and `searchParams` are `Promise<…>` in Next 16 — `await` them in `[slug]/page.tsx` routes. Everything else we need already works how you'd expect.

## Environment

- `VAULT_PATH` — absolute path to the Obsidian vault. Required. On trav-dev: `/home/brad/Documents/Traversy Lab`. On trav-ai: wherever the vault is mounted/synced.
- `PORT` — production port. `8890` on trav-ai. Ignored by `pnpm dev`.

Copy `.env.example` to `.env.local` for local dev.

## More context (vault paths)

- **Build Brief** — full scope, tab specs, phases: `Projects/TravAI/Mission Control/Build Brief.md`
- **AI Rules** — write boundaries, Obsidian compatibility: `Core/Context/AI Rules.md`
- **Session logs** (this project): `Core/Sessions/Claude/*mission-control*.md`
- **Resume command**: `/resume mission-control`
- **Network dashboard** (precedent for deploy pattern): `travxlabs/network-dashboard`, runbook at `Network/Runbooks/Deploy Network Dashboard to trav-ai.md`

## Code Conventions

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
