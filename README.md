# Mission Control

![Mission Control](docs/screenshot.png)

A personal command center I built to manage my own workflow on top of an Obsidian vault. It reads markdown files straight from disk and surfaces tasks, projects, sessions, research, network health, calendar, and agent activity in a single dashboard — no database, no cloud, no auth.

This is **not** a general-purpose tool. It's tailored to the specific way I structure my vault and run my day, and I'm publishing it mostly so people can see how it works or pick pieces out for their own setup. If you fork it, expect to rewire the parsers to match your own vault layout.

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

The vault layout this expects (`Todos/`, `Tasks/`, `Projects/`, `Network/`, `Core/Sessions/`, etc.) reflects my personal workflow. The parsers in `src/lib/parsers/` are the place to start if you want to adapt it to a different structure.

## License

MIT
