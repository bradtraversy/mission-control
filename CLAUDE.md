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
- **Tasks vs Todos** — distinct folders, distinct lifecycles:
  - `Todos/` = Brad's personal list, `#1`–`#N` ID system, Now/Soon/Later.
  - `Tasks/` = agent work units, one markdown file per task, frontmatter-driven lifecycle (`status`, `agent`, `project`, `priority`).
- **Agent routing** via the `agent` frontmatter field on `Tasks/*.md`:
  - `travis` — Travis's heartbeat on trav-ai picks up queued tasks.
  - `claude` — Claude sessions pick up queued tasks at `/resume` time.
  - `brad` — self-assigned; no agent claims these.
- **Pause marker**: `Tasks/_control.json` with `{"paused": true}`. All agents must check this before pulling work.
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
