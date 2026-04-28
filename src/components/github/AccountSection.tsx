"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { ContributionGraph } from "@/components/github/ContributionGraph";
import type { GithubAccountData, GithubRepo } from "@/lib";

type Props = {
  account: GithubAccountData;
  /** Pre-computed by the server: repos pushed within ACTIVE_DAYS. */
  activeRepos: GithubRepo[];
  /** "Now" anchor from the server, ms since epoch. */
  serverNow: number;
};

const ACTIVE_DAYS = 90;
const COLLAPSED_LIMIT = 12;

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return "—";
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
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export function AccountSection({ account, activeRepos, serverNow }: Props) {
  const [showAll, setShowAll] = useState(false);
  const totalRepos = account.repos.length;
  const visible = showAll
    ? account.repos
    : activeRepos.length > 0
      ? activeRepos.slice(0, COLLAPSED_LIMIT)
      : account.repos.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = totalRepos - visible.length;

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <a
            href={account.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-lg font-medium tracking-tight text-foreground hover:text-accent transition-colors"
          >
            {account.login}
          </a>
          {account.isAuthUser && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
              authenticated
            </span>
          )}
          <span className="text-[12px] text-muted/70">
            {totalRepos} {totalRepos === 1 ? "repo" : "repos"} ·{" "}
            {activeRepos.length} active in last {ACTIVE_DAYS}d
          </span>
        </div>
      </header>

      {account.errorMessage ? (
        <Card>
          <CardBody>
            <p className="text-[13px] text-rose-300/90 font-mono break-words">
              {account.errorMessage}
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {account.contributions && (
            <Card>
              <CardBody className="pt-4">
                <ContributionGraph calendar={account.contributions} />
              </CardBody>
            </Card>
          )}

          {totalRepos > 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[12px] uppercase tracking-wider text-muted/70">
                  {showAll
                    ? `All ${totalRepos} repos`
                    : `Active repos · last ${ACTIVE_DAYS} days`}
                </h3>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="text-[12px] text-muted hover:text-accent transition-colors"
                  >
                    {showAll ? "Show less" : `Show all ${totalRepos} →`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visible.map((r) => (
                  <RepoCard key={r.fullName} repo={r} now={serverNow} />
                ))}
              </div>
              {visible.length === 0 && (
                <p className="text-[13px] text-muted/60 italic py-2">
                  No repos pushed in the last {ACTIVE_DAYS} days.{" "}
                  {totalRepos > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="text-accent hover:underline"
                    >
                      Show all {totalRepos}
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RepoCard({ repo, now }: { repo: GithubRepo; now: number }) {
  return (
    <a href={repo.url} target="_blank" rel="noreferrer" className="block">
      <Card className="hover:border-accent/40 transition-colors h-full">
        <CardBody className="space-y-1 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-foreground truncate">
              {repo.name}
            </span>
            {repo.isPrivate && (
              <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-surface-2 text-muted/70">
                private
              </span>
            )}
          </div>
          {repo.description && (
            <p className="text-[12px] text-muted leading-snug line-clamp-2">
              {repo.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted/60 font-mono pt-0.5">
            {repo.language && <span>{repo.language}</span>}
            {repo.stargazers > 0 && (
              <>
                {repo.language && <span className="text-muted/30">·</span>}
                <span>★ {repo.stargazers.toLocaleString()}</span>
              </>
            )}
            {repo.pushedAt && (
              <>
                {(repo.language || repo.stargazers > 0) && (
                  <span className="text-muted/30">·</span>
                )}
                <span>pushed {formatRelative(repo.pushedAt, now)}</span>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </a>
  );
}
