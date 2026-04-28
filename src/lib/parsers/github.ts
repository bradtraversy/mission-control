export type GithubEventKind =
  | "push"
  | "pr-opened"
  | "pr-merged"
  | "pr-closed"
  | "issue-opened"
  | "issue-closed"
  | "issue-comment"
  | "release"
  | "fork"
  | "create"
  | "delete"
  | "other";

export type GithubEvent = {
  id: string;
  kind: GithubEventKind;
  repo: string;
  actor: string;
  title: string;
  detail: string | null;
  url: string;
  createdAt: string;
};

export type GithubRepo = {
  name: string;
  fullName: string;
  isPrivate: boolean;
  pushedAt: string | null;
  description: string | null;
  url: string;
};

export type GithubFeedSnapshot = {
  configured: boolean;
  org: string;
  repos: GithubRepo[];
  events: GithubEvent[];
  rateRemaining: number | null;
  rateReset: string | null;
  fetchedAt: string;
  errorMessage: string | null;
};

const API = "https://api.github.com";
const CACHE_MS = 60_000;

type Cached = { snapshot: GithubFeedSnapshot; at: number };
let cache: Cached | null = null;

async function ghFetch(
  url: string,
  token: string,
): Promise<{ data: unknown; rateRemaining: number | null; rateReset: string | null }> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "mission-control",
    },
    cache: "no-store",
  });
  const rateRemainingHeader = res.headers.get("x-ratelimit-remaining");
  const rateResetHeader = res.headers.get("x-ratelimit-reset");
  const rateRemaining = rateRemainingHeader
    ? Number.parseInt(rateRemainingHeader, 10)
    : null;
  const rateReset = rateResetHeader
    ? new Date(Number.parseInt(rateResetHeader, 10) * 1000).toISOString()
    : null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }
  return { data: await res.json(), rateRemaining, rateReset };
}

type RawRepo = {
  name: string;
  full_name: string;
  private: boolean;
  pushed_at: string | null;
  description: string | null;
  html_url: string;
  archived?: boolean;
  fork?: boolean;
  owner?: { login?: string };
};

type RawEvent = {
  id: string;
  type: string;
  actor?: { login?: string };
  repo?: { name?: string };
  created_at: string;
  payload?: Record<string, unknown>;
};

// Limit enrichment so a single page render can't blow the rate budget. With
// 10 calls per top-of-feed render and a 60s snapshot cache, that's ~600/hr —
// well under 5000/hr authenticated.
const ENRICH_PUSH_LIMIT = 10;

function classifyEvent(raw: RawEvent): GithubEvent | null {
  const repoName = raw.repo?.name ?? "unknown";
  const actor = raw.actor?.login ?? "unknown";
  const id = `${repoName}:${raw.id}`;
  const createdAt = raw.created_at;

  switch (raw.type) {
    case "PushEvent": {
      const payload = raw.payload as
        | {
            ref?: string;
            commits?: { message: string; sha: string }[];
            size?: number | null;
            head?: string;
          }
        | undefined;
      const branch = payload?.ref?.replace("refs/heads/", "") ?? "";
      const commits = payload?.commits ?? [];
      // Fine-grained PATs strip size + commits[] from PushEvent. Fall back to
      // the head SHA which IS always present, and let an enrichment pass fill
      // in the commit message later.
      const headSha = payload?.head ?? commits[commits.length - 1]?.sha ?? null;
      const inlineMessage = commits[commits.length - 1]?.message?.split("\n")[0] ?? null;
      const size = payload?.size ?? (commits.length || null);
      const sizeText = size != null ? `${size} commit${size === 1 ? "" : "s"} to ${branch}` : `Push to ${branch}`;
      return {
        id,
        kind: "push",
        repo: repoName,
        actor,
        title: sizeText,
        detail: inlineMessage ?? (headSha ? headSha.slice(0, 7) : null),
        url: headSha
          ? `https://github.com/${repoName}/commit/${headSha}`
          : `https://github.com/${repoName}/commits/${branch}`,
        createdAt,
      };
    }
    case "PullRequestEvent": {
      const payload = raw.payload as
        | { action?: string; pull_request?: { title?: string; html_url?: string; merged?: boolean; number?: number } }
        | undefined;
      const action = payload?.action ?? "";
      const pr = payload?.pull_request;
      const merged = pr?.merged === true;
      const kind: GithubEventKind =
        action === "opened" || action === "reopened"
          ? "pr-opened"
          : action === "closed"
            ? merged
              ? "pr-merged"
              : "pr-closed"
            : "other";
      return {
        id,
        kind,
        repo: repoName,
        actor,
        title: `PR ${kind === "pr-merged" ? "merged" : kind === "pr-closed" ? "closed" : "opened"}: ${pr?.title ?? ""}`,
        detail: pr?.number != null ? `#${pr.number}` : null,
        url: pr?.html_url ?? `https://github.com/${repoName}`,
        createdAt,
      };
    }
    case "IssuesEvent": {
      const payload = raw.payload as
        | { action?: string; issue?: { title?: string; html_url?: string; number?: number } }
        | undefined;
      const action = payload?.action ?? "";
      const issue = payload?.issue;
      const kind: GithubEventKind =
        action === "opened"
          ? "issue-opened"
          : action === "closed"
            ? "issue-closed"
            : "other";
      return {
        id,
        kind,
        repo: repoName,
        actor,
        title: `Issue ${action}: ${issue?.title ?? ""}`,
        detail: issue?.number != null ? `#${issue.number}` : null,
        url: issue?.html_url ?? `https://github.com/${repoName}`,
        createdAt,
      };
    }
    case "IssueCommentEvent": {
      const payload = raw.payload as
        | { issue?: { title?: string; html_url?: string; number?: number } }
        | undefined;
      const issue = payload?.issue;
      return {
        id,
        kind: "issue-comment",
        repo: repoName,
        actor,
        title: `Comment on: ${issue?.title ?? ""}`,
        detail: issue?.number != null ? `#${issue.number}` : null,
        url: issue?.html_url ?? `https://github.com/${repoName}`,
        createdAt,
      };
    }
    case "ReleaseEvent": {
      const payload = raw.payload as
        | { release?: { tag_name?: string; name?: string; html_url?: string } }
        | undefined;
      const release = payload?.release;
      return {
        id,
        kind: "release",
        repo: repoName,
        actor,
        title: `Release ${release?.tag_name ?? release?.name ?? ""}`,
        detail: release?.name && release.tag_name !== release.name ? release.name : null,
        url: release?.html_url ?? `https://github.com/${repoName}/releases`,
        createdAt,
      };
    }
    case "CreateEvent": {
      const payload = raw.payload as
        | { ref_type?: string; ref?: string }
        | undefined;
      return {
        id,
        kind: "create",
        repo: repoName,
        actor,
        title: `${payload?.ref_type ?? "ref"} created${payload?.ref ? `: ${payload.ref}` : ""}`,
        detail: null,
        url: `https://github.com/${repoName}`,
        createdAt,
      };
    }
    case "DeleteEvent": {
      const payload = raw.payload as
        | { ref_type?: string; ref?: string }
        | undefined;
      return {
        id,
        kind: "delete",
        repo: repoName,
        actor,
        title: `${payload?.ref_type ?? "ref"} deleted${payload?.ref ? `: ${payload.ref}` : ""}`,
        detail: null,
        url: `https://github.com/${repoName}`,
        createdAt,
      };
    }
    case "ForkEvent":
      return {
        id,
        kind: "fork",
        repo: repoName,
        actor,
        title: "Fork",
        detail: null,
        url: `https://github.com/${repoName}`,
        createdAt,
      };
    default:
      return null;
  }
}

export async function getGithubFeed(): Promise<GithubFeedSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.snapshot;

  const token = process.env.GITHUB_TOKEN ?? "";
  const org = process.env.GITHUB_ORG ?? "travxlabs";
  const fetchedAt = new Date().toISOString();

  if (!token) {
    const snapshot: GithubFeedSnapshot = {
      configured: false,
      org,
      repos: [],
      events: [],
      rateRemaining: null,
      rateReset: null,
      fetchedAt,
      errorMessage: null,
    };
    cache = { snapshot, at: now };
    return snapshot;
  }

  let lastRateRemaining: number | null = null;
  let lastRateReset: string | null = null;
  try {
    // /user/repos works for both user-owned and org-member PATs and returns
    // private repos. Filter by owner.login === GITHUB_ORG so the tab only
    // shows repos under the configured account, not every repo the PAT can
    // see (collaborator/contributor noise).
    const reposRes = await ghFetch(
      `${API}/user/repos?per_page=100&sort=pushed&direction=desc&affiliation=owner,organization_member`,
      token,
    );
    lastRateRemaining = reposRes.rateRemaining;
    lastRateReset = reposRes.rateReset;
    const orgLower = org.toLowerCase();
    const repoList = (reposRes.data as RawRepo[]).filter(
      (r) =>
        !r.archived &&
        !r.fork &&
        r.owner?.login?.toLowerCase() === orgLower,
    );
    const repos: GithubRepo[] = repoList.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      isPrivate: r.private,
      pushedAt: r.pushed_at,
      description: r.description,
      url: r.html_url,
    }));

    // Fetch the 5 most-recently-pushed repos in parallel for events. Anything
    // older is unlikely to have new activity in the feed window anyway.
    const eventReposLimit = 5;
    const eventTargets = repoList.slice(0, eventReposLimit);
    const eventResults = await Promise.allSettled(
      eventTargets.map((r) =>
        ghFetch(`${API}/repos/${r.full_name}/events?per_page=20`, token),
      ),
    );

    const events: GithubEvent[] = [];
    for (const result of eventResults) {
      if (result.status !== "fulfilled") continue;
      lastRateRemaining = result.value.rateRemaining ?? lastRateRemaining;
      lastRateReset = result.value.rateReset ?? lastRateReset;
      for (const raw of result.value.data as RawEvent[]) {
        const classified = classifyEvent(raw);
        if (classified) events.push(classified);
      }
    }
    events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Enrich the top N push events whose detail is just a short SHA (i.e.
    // came back without inline commit messages — fine-grained PAT case).
    // Each fetch is one extra API call but bounded by ENRICH_PUSH_LIMIT.
    const enrichTargets: { event: GithubEvent; sha: string }[] = [];
    for (const e of events) {
      if (enrichTargets.length >= ENRICH_PUSH_LIMIT) break;
      if (e.kind !== "push") continue;
      const m = e.url.match(/\/commit\/([0-9a-f]{40})/);
      if (!m) continue;
      const isShortSha = e.detail && /^[0-9a-f]{7}$/.test(e.detail);
      if (!isShortSha) continue;
      enrichTargets.push({ event: e, sha: m[1] });
    }
    if (enrichTargets.length > 0) {
      const enrichResults = await Promise.allSettled(
        enrichTargets.map(({ event, sha }) =>
          ghFetch(`${API}/repos/${event.repo}/commits/${sha}`, token),
        ),
      );
      for (let i = 0; i < enrichResults.length; i++) {
        const r = enrichResults[i];
        if (r.status !== "fulfilled") continue;
        lastRateRemaining = r.value.rateRemaining ?? lastRateRemaining;
        lastRateReset = r.value.rateReset ?? lastRateReset;
        const data = r.value.data as
          | { commit?: { message?: string } }
          | undefined;
        const message = data?.commit?.message?.split("\n")[0]?.trim();
        if (message) enrichTargets[i].event.detail = message;
      }
    }

    const snapshot: GithubFeedSnapshot = {
      configured: true,
      org,
      repos,
      events: events.slice(0, 50),
      rateRemaining: lastRateRemaining,
      rateReset: lastRateReset,
      fetchedAt,
      errorMessage: null,
    };
    cache = { snapshot, at: now };
    return snapshot;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const snapshot: GithubFeedSnapshot = {
      configured: true,
      org,
      repos: [],
      events: [],
      rateRemaining: lastRateRemaining,
      rateReset: lastRateReset,
      fetchedAt,
      errorMessage: message,
    };
    cache = { snapshot, at: now };
    return snapshot;
  }
}
