import { Card, CardBody } from "@/components/ui/Card";
import { AccountSection } from "@/components/github/AccountSection";
import { getGithubFeed } from "@/lib";
import type { GithubEvent, GithubEventKind } from "@/lib";

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

function formatRelative(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
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

const ACTIVE_DAYS = 90;

export default async function Page() {
  const snap = await getGithubFeed();
  const totalRepos = snap.accounts.reduce((sum, a) => sum + a.repos.length, 0);
  const serverNow = new Date(snap.fetchedAt).getTime();
  const cutoff = serverNow - ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const activeReposByAccount = new Map(
    snap.accounts.map((acc) => [
      acc.login,
      acc.repos.filter((r) =>
        r.pushedAt ? new Date(r.pushedAt).getTime() >= cutoff : false,
      ),
    ]),
  );

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">GitHub</h1>
        <p className="text-[14px] text-muted">
          Activity across {snap.accounts.length}{" "}
          {snap.accounts.length === 1 ? "account" : "accounts"} ·{" "}
          {totalRepos} {totalRepos === 1 ? "repo" : "repos"} total
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
          {snap.accounts.map((acc) => (
            <AccountSection
              key={acc.login}
              account={acc}
              activeRepos={activeReposByAccount.get(acc.login) ?? []}
              serverNow={serverNow}
            />
          ))}
          <EventsFeed events={snap.events} now={serverNow} />
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
          and restart the service. Use a fine-grained PAT with{" "}
          <code>metadata: read</code> + <code>contents: read</code> scoped to
          your accounts. Configure accounts via{" "}
          <code>GITHUB_ACCOUNTS=user1,user2</code>.
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
      </CardBody>
    </Card>
  );
}

function EventsFeed({ events, now }: { events: GithubEvent[]; now: number }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted">
        Activity feed · all accounts
      </h2>
      {events.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-[14px] text-muted/60 italic">
              No recent events. The Events API only goes back ~90 days.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="!p-0">
            <ul className="divide-y divide-border/40">
              {events.map((e) => (
                <EventRow key={e.id} event={e} now={now} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </section>
  );
}

function EventRow({ event, now }: { event: GithubEvent; now: number }) {
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
              {formatRelative(event.createdAt, now)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-[12px] text-muted/70">
            <span className="font-mono">
              {event.account}/{repoShort}
            </span>
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
