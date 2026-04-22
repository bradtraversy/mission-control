# Mission Control

Brad's personal command center. Reads the Obsidian vault as its database and surfaces tasks, projects, sessions, research, network health, calendar, and agent activity in one place.

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Data source**: the Obsidian vault at `$VAULT_PATH` — read directly from disk, no DB
- **Hosting**: LAN-only on trav-ai (port 8890), local network trusted, no auth
- **Dev machine**: trav-dev at `~/Code/mission-control`
- **Repo**: private, `travxlabs/mission-control` (cloned via the `github-travxlabs` SSH alias)

Supersedes the `travxlabs/network-dashboard` Python MVP — Network panels will be rebuilt in React here and the Python service retired once this tab reaches parity. Full spec: `Projects/TravAI/Mission Control/Build Brief.md` in the vault.

## Setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Dev server runs on `http://localhost:3000`.

## Scripts

- `pnpm dev` — Turbopack dev server
- `pnpm build` — production build
- `pnpm start` — production server (reads `PORT` from env)
- `pnpm lint` — ESLint

## Env vars

| Variable     | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| `VAULT_PATH` | Absolute path to the Obsidian vault directory. Required.         |
| `PORT`       | Port for `next start` on trav-ai. Defaults to 3000 otherwise.    |

## Topology

```
trav-dev (dev)                          trav-ai (prod, LAN-only)
─────────────────                       ─────────────────────────
~/Code/mission-control                  ~/Code/mission-control
    pnpm dev                                pnpm start → :8890
         │                                       ▲
         │ git push                              │ git pull && systemctl --user restart
         ▼                                       │
    github.com/travxlabs/mission-control (private)
                        ▲
                        │ reads (both sides)
                        │
                 ~/Documents/Traversy Lab/   ← the vault (database)
```

Ownership: Claude (trav-dev) owns the code; Travis (trav-ai) owns `Network/data/*.json` feeds and only runs `git pull && systemctl --user restart mission-control` after Claude pushes.

## Deploy

Deploy to trav-ai runs as a systemd-user service — no Docker. See `Network/Runbooks/Deploy Mission Control to trav-ai.md` in the vault for the full runbook (authored by Travis).
