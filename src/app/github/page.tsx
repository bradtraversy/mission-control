import { Card, CardBody } from "@/components/ui/Card";
import { getGithubFeed } from "@/lib";
import type { GithubEvent, GithubEventKind, GithubRepo } from "@/lib";

const KIND_DOT: Record<GithubEventKind, string> = {
  push: "bg-emerald-400",
  "pr-opened": "bg-sky-400",
  "pr-merged": "bg-violet-400",
  "pr-closed": "bg-muted",
  "issue-opened": "bg-amber-400",
  "issue-closed": "bg-emerald-400",
  "issue-comment": "bg-sky-400",
  release: "bg-rose-400",
  fork: "bg-muted",
  create: "bg-muted",
  delete: "bg-muted",
  other: "bg-muted",
};

const KIND_TONE: Record<GithubEventKind, string> = {
  push: "text-emerald-300",
  "pr-opened": "text-sky-300",
  "pr-merged": "text-violet-300",
  "pr-closed": "text-muted/80",
  "issue-opened": "text-amber-300",
  "issue-closed": "text-emerald-300",
  "issue-comment": "text-sky-300",
  release: "text-rose-300",
  fork: "text-muted",
  create: "text-muted/80",
  delete: "text-muted/60",
  other: "text-muted",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return iso;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  return `${mo}mo ago`;
}

export default async function Page() {
  const snap = await getGithubFeed();

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">GitHub</h1>
        <p className="text-[14px] text-muted">
          Activity across <code className="text-foreground/80">{snap.org}/</code>{" "}
          repos · {snap.repos.length}{" "}
          {snap.repos.length === 1 ? "repo" : "repos"}
          {snap.rateRemaining !== null && (
            <> · {snap.rateRemaining} API calls left this hour</>
          )}
        </p>
      </header>

      {!snap.configured && <NotConfigured />}
      {snap.configured && snap.errorMessage && (
        <ErrorCard message={snap.errorMessage} />
      )}
      {snap.configured && !snap.errorMessage && (
        <>
          <ReposGrid repos={snap.repos} />
          <EventsFeed events={snap.events} />
        </>
      )}
    </div>
  );
}

function NotConfigured() {
  return (
    <Card>
      <CardBody className="space-y-2 pt-4">
        <h2 className="text-base font-medium text-foreground">
          GitHub token not set
        </h2>
        <p className="text-[14px] text-muted leading-relaxed">
          Set <code>GITHUB_TOKEN</code> in <code>.env.local</code> on trav-ai
          and restart the service. Use a fine-grained PAT scoped to the{" "}
          <code>travxlabs</code> org with <code>metadata: read</code> +{" "}
          <code>contents: read</code>. Create one at{" "}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            github.com/settings/tokens ↗
          </a>
          .
        </p>
      </CardBody>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardBody className="space-y-1 pt-4">
        <h2 className="text-[13px] uppercase tracking-wider text-rose-300">
          GitHub API error
        </h2>
        <p className="text-[13px] text-muted/80 font-mono break-words">
          {message}
        </p>
        <p className="text-[12px] text-muted/60">
          Most common cause: PAT lacks the right scopes, or the org name is
          wrong. Adjust <code>GITHUB_TOKEN</code> / <code>GITHUB_ORG</code> in{" "}
          <code>.env.local</code> and restart MC.
        </p>
      </CardBody>
    </Card>
  );
}

function ReposGrid({ repos }: { repos: GithubRepo[] }) {
  if (repos.length === 0) {
    return (
      <p className="text-[14px] text-muted/60 italic">
        No repos returned by the API. Verify the org name and token scopes.
      </p>
    );
  }
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Repos · sorted by latest push
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {repos.map((r) => (
          <a
            key={r.fullName}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Card className="hover:border-accent/40 transition-colors">
              <CardBody className="space-y-1 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-foreground truncate">
                    {r.name}
                  </span>
                  {r.isPrivate && (
                    <span className="text-[10px] uppercase tracking-wider px-1 py-0.5 rounded bg-surface-2 text-muted/70">
                      private
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="text-[13px] text-muted leading-snug line-clamp-2">
                    {r.description}
                  </p>
                )}
                {r.pushedAt && (
                  <p className="text-[12px] text-muted/60 font-mono">
                    pushed {formatRelative(r.pushedAt)}
                  </p>
                )}
              </CardBody>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

function EventsFeed({ events }: { events: GithubEvent[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Activity feed
      </h2>
      {events.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-[14px] text-muted/60 italic">
              No recent events from the top repos. The Events API only goes
              back ~90 days and respects exclusions; nothing here means nothing
              new.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="!p-0">
            <ul className="divide-y divide-border/40">
              {events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </section>
  );
}

function EventRow({ event }: { event: GithubEvent }) {
  const repoShort = event.repo.split("/").pop() ?? event.repo;
  return (
    <li>
      <a
        href={event.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2/40 transition-colors"
      >
        <span
          className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${KIND_DOT[event.kind]}`}
          aria-hidden
        />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-[14px] truncate ${KIND_TONE[event.kind]}`}>
              {event.title}
            </span>
            <span className="text-[11px] text-muted/60 font-mono shrink-0">
              {formatRelative(event.createdAt)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-[12px] text-muted/70">
            <span className="font-mono">{repoShort}</span>
            <span className="text-muted/40">·</span>
            <span>{event.actor}</span>
            {event.detail && (
              <>
                <span className="text-muted/40">·</span>
                <span className="truncate">{event.detail}</span>
              </>
            )}
          </div>
        </div>
      </a>
    </li>
  );
}
