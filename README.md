# Mission Control

A personal command center built on top of an Obsidian vault. Reads markdown files directly from disk and surfaces tasks, projects, sessions, research, network health, calendar, and agent activity in one place — no database, no cloud, no auth.

Built for single-user, local-network use. The vault on disk is the source of truth; this app is a read-mostly view with a narrow write surface.

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Data source**: an Obsidian vault at `$VAULT_PATH` — read directly from disk, no DB
- **Hosting**: designed to run as a local service on a home/lab machine

## Setup

```bash
cp .env.example .env.local
# edit .env.local and set VAULT_PATH to your Obsidian vault
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

| Variable     | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `VAULT_PATH` | Absolute path to your Obsidian vault directory. Required.   |
| `PORT`       | Port for `next start` in production. Defaults to 3000.      |

## How it works

The vault is the database. Every read parses YAML frontmatter from a markdown file with `gray-matter`, and every write goes back as a markdown file Obsidian can open. There's no hidden state and no sidecar files — anything Mission Control writes, you could also have written by hand.

A file watcher (`chokidar`) on the server pushes change events to the browser over SSE, so panels stay live as the vault is edited.

## Notes

This was built as a personal tool, so the vault layout it expects (`Todos/`, `Tasks/`, `Projects/`, `Network/`, `Core/Sessions/`, etc.) reflects one specific workflow. If you fork it, expect to rewire the parsers in `src/lib/parsers/` to match your own vault structure.

## License

MIT
