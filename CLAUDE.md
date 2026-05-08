# Mission Control

A personal command center that reads an Obsidian vault as its database. Single-user, local-network use, no auth.

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

## Deploy model

Designed to run as a local service (e.g. systemd-user) on a home/lab machine, with the vault either on the same disk or synced to it. **No Docker.** Dev happens on one box, production runs on another, both pointed at the same vault.

## Key conventions

- **Vault is the database.** Every read and write is a markdown file on disk. Parse YAML frontmatter with `gray-matter`.
- **Writes must be Obsidian-compatible.** No hidden state, no sidecar files the user wouldn't also write by hand.
- **Exclude these vault paths from generic parsing**: `CLAUDE.md`, `AGENTS.md`, `HEARTBEAT.md`, `SOUL.md`, `USER.md`, `MEMORY.md`, `TOOLS.md`, `IDENTITY.md`, `Core/Context/AI Rules.md`, `.claude/`, `.openclaw/`, `.obsidian/`, `.trash/`, any dotfile/dotdir.
- **Todos vs Tasks** — split by _time horizon_, not by human-vs-agent. Both humans and agents write to both:
  - `Todos/` = long-term curated backlog. `Now.md` / `Soon.md` / `Later.md`, global `#N` IDs, brand tags.
  - `Tasks/` = short-term quick queue. One file per task: `YYYY-MM-DD-<slug>.md`. Frontmatter: `type | created | status | agent` only — no id, priority, project, or tags. Tags go in the body (`#vidpipe`, `#high`).
- **Task statuses**: `queued` → `claimed` → `done` (3 states). Done tasks auto-archive to `Tasks/archive/YYYY-MM/` after 7 days.
- **Agent routing** via the `agent` frontmatter field on `Tasks/*.md`. The remote agent only reads `Tasks/`, never `Todos/`.
- **Ref-to-Todo**: a Task body can reference a Todo with `Ref: #N`. The completing agent flips the Task to `done` and also checks off `#N` in the matching Todo file.
- **Pause marker**: `Tasks/_control.json` with `{"paused": true}`. All agents must check this before pulling work.
- **Narrow write surface.** MC only writes five structured operations: (1) check off a todo, (2) move a todo between Now/Soon/Later, (3) add a new todo (next `#N`), (4) change a task's status, (5) add a new task. Toggle Pause also writes `Tasks/_control.json`. Anything else is read-only with an "Edit in Obsidian" button that opens the file via `obsidian://` URI.
- **Live updates**: chokidar watches the vault on the server side, SSE pushes change events to the browser. Debounce ~100ms.
- **Dark-first UI**, Linear-ish aesthetic. Palette tokens in `globals.css` `@theme`. System font stack, no web fonts by default.

## Next.js note

`params` and `searchParams` are `Promise<…>` in Next 16 — `await` them in `[slug]/page.tsx` routes. Everything else we need already works how you'd expect.

## Environment

- `VAULT_PATH` — absolute path to the Obsidian vault. Required.
- `PORT` — production port. Ignored by `pnpm dev`.

Copy `.env.example` to `.env.local` for local dev.

## Code Conventions

- Strict mode enabled
- No `any` types — use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused — one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Branching

- **Feature-sized chunks** land on a `feature/<name>` branch. When done, merge into `main` locally, push, and delete the branch (`git branch -d <name>` + `git push origin --delete <name>`). No PR — solo reviewer, the branch itself is the isolation.
- **Bug fixes** land on a `fix/<name>` branch. Same local-merge flow.
- **Trivial edits** go straight to `main` — copy fixes, CLAUDE.md tweaks, `.gitignore` tweaks, typos, small config nudges, stub descriptions.
- Every push is preceded by a local verification (dev server boots clean, probe runs, types check). `main` is the reviewed work stream.
- NEVER PUT CLAUDE IN THE COMMIT MESSAGE!
