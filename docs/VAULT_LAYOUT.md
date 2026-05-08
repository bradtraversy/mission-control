# Vault layout

Mission Control reads a specific directory shape inside `$VAULT_PATH`. This page documents what's expected and gives example files for the pieces with structure. If a directory doesn't exist, parsers fail soft (empty result) — you don't need everything to boot the app.

```
<vault root>/
├── Todos/
│   ├── Now.md              # checked-list, global #N IDs
│   ├── Soon.md
│   └── Later.md
├── Tasks/
│   ├── 2026-05-08-fix-thing.md   # one file per task
│   ├── _control.json             # {"paused": true|false}
│   └── archive/YYYY-MM/...        # auto-archive after 7 days
├── Projects/
│   └── <Project Name>/...        # free-form per project (linked from Projects.md)
├── Core/
│   ├── Context/
│   │   ├── Projects.md           # the project index
│   │   ├── Current State.md      # this-week / decisions / questions / sponsors
│   │   └── Agents.md             # optional, agent registry
│   └── Sessions/
│       ├── Claude/YYYY-MM-DD-*.md
│       └── OpenClaw/YYYY-MM-DD-*.md
├── Business/
│   └── Sponsors/<slug>.md         # one file per sponsor deal
├── Research/
│   ├── Digests/YYYY-MM-DD-*.md   # daily/weekly tech digests
│   └── YouTube/YYYY-MM-DD-*.md   # video idea notes
├── YouTube/...                   # any YouTube-related notes (read for activity feed)
├── Calendar/
│   └── Upcoming.md               # today + next few days
├── Network/
│   └── data/                     # JSON status feeds (heartbeats, health)
│       ├── service-health.json
│       ├── automations-health.json
│       ├── connectivity-state.json
│       ├── disk-stats.json
│       ├── cron-jobs.json
│       └── youtube-recent.json
└── Daily/                        # daily notes (optional, surfaced in activity)
```

## Todos — `Todos/Now.md`, `Soon.md`, `Later.md`

Long-term curated backlog. Three columns by horizon. IDs are global — `#28` in Now stays `#28` if it moves to Later.

```markdown
# Now

- [ ] `#28` Solo 401(k) — confirm Schwab account status #personal
- [ ] `#29` Brainstorm ideas for talking head video #media
- [x] `#27` Ship vault security scan ✅ 2026-05-06
```

Format:
- `- [ ]` or `- [x]` — open or done
- `` `#N` `` — backticked, numeric ID, globally unique across all three files
- Free text body
- `#tag` — one or more tags (lowercase, hyphenated)
- ` ✅ YYYY-MM-DD` — completed date appended on check-off (Mission Control writes this)

## Tasks — `Tasks/YYYY-MM-DD-<slug>.md`

Short-term throwaway queue. One file per task. Done tasks auto-archive to `Tasks/archive/YYYY-MM/` after 7 days.

```markdown
---
type: task
created: 2026-05-08T09:14:00-04:00
status: queued
agent: claude-code
---

# Wire up the new sponsor field

Add `industry` to the sponsor frontmatter and surface it in the deadlines panel.

Ref: Now#42
```

Frontmatter:
- `type: task` — required
- `created` — ISO 8601 timestamp
- `status` — `queued` | `claimed` | `done`
- `agent` — `travis` | `claude-code` | `claude-cowork` | `brad`

Body:
- `# <title>` — first heading is the task title (falls back to filename)
- `Ref: Now#42` — optional pointer to a Todo. When the task flips to `done`, the writer also checks off `#42` in `Todos/Now.md`.
- Tags go in the body as `#tag`, not in frontmatter.

## Tasks pause — `Tasks/_control.json`

```json
{ "paused": true }
```

When `paused: true`, all agents must skip pulling work. Toggled from the Mission Control header.

## Projects — `Core/Context/Projects.md` + `Projects/<name>/`

A single index file lists every project; the per-project folder is free-form. The parser reads structured fields from the index:

```markdown
## Mission Control

- **Status**: active — milestone: public release
- **Repo**: [bradtraversy/mission-control](https://github.com/bradtraversy/mission-control)
- **Tags**: #internal #infra
```

Recognized fields: `Status`, `Repo`, `Tags` (other bullets are ignored).

## Current State — `Core/Context/Current State.md`

The "what's hot right now" file. Sections recognized:

- `## This Week` — shown on the dashboard top-3
- `## Immediate Actions`
- `## Recent Decisions`
- `## Open Questions`
- `## Sponsor Pipeline` — text block parsed for the sponsor widget

Each is a markdown list under its heading.

## Sponsors — `Business/Sponsors/<slug>.md`

```markdown
---
type: sponsor
status: active
amount: 4500
paid: 2000
due: 2026-06-15
---

# Sponsor Display Name

Notes, contact info, deliverable history, etc.
```

Slugs must match `^[a-z0-9][a-z0-9-]*$`.

## Sessions — `Core/Sessions/Claude/` and `Core/Sessions/OpenClaw/`

Session logs from past work — one file per session, prefixed with date:

```
2026-05-08-mission-control-public-release.md
```

Frontmatter is optional but `date:` if present is preferred over the filename date. These power the Recent Sessions widget on the dashboard.

## Digests — `Research/Digests/`

Daily/weekly tech news digests. Filename leads with date. Mission Control just lists them; rendering is markdown.

## YouTube ideas — `Research/YouTube/`

```markdown
---
status: idea          # idea | drafted | scripted | recorded | published
title: Some video idea
created: 2026-05-08
---
```

## Network feeds — `Network/data/*.json`

Plain JSON status files written by external cron jobs. Mission Control reads them on demand; updates to this folder do *not* trigger the live SSE refresh (high-frequency by design). See `src/lib/parsers/network.ts` for the exact shape each file expects.

## Calendar — `Calendar/Upcoming.md`

Free-form markdown. Today's bullets and the next few days.

## Excluded paths

These are skipped by all parsers and the file watcher:

- `CLAUDE.md`, `AGENTS.md`, `HEARTBEAT.md`, `SOUL.md`, `USER.md`, `MEMORY.md`, `TOOLS.md`, `IDENTITY.md` (any directory)
- `Core/Context/AI Rules.md`
- Anything starting with a dot (`.obsidian/`, `.trash/`, `.claude/`, dotfiles)

If you fork, this list lives in `src/lib/vault.ts`.
