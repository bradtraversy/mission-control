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
  account: string;
  repo: string;
  actor: string;
  title: string;
  detail: string | null;
  url: string;
  createdAt: string;
};

export type GithubRepo = {
  account: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  pushedAt: string | null;
  description: string | null;
  url: string;
  language: string | null;
  stargazers: number;
};

export type GithubContributionDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type GithubContributionCalendar = {
  totalContributions: number;
  weeks: GithubContributionDay[][];
};

export type GithubAccountData = {
  login: string;
  htmlUrl: string;
  isAuthUser: boolean;
  repos: GithubRepo[];
  events: GithubEvent[];
  contributions: GithubContributionCalendar | null;
  errorMessage: string | null;
};

export type GithubFeedSnapshot = {
  configured: boolean;
  accounts: GithubAccountData[];
  events: GithubEvent[];
  rateRemaining: number | null;
  rateReset: string | null;
  fetchedAt: string;
  errorMessage: string | null;
};

const API = "https://api.github.com";
const GRAPHQL = "https://api.github.com/graphql";
const CACHE_MS = 60_000;
const ENRICH_PUSH_LIMIT = 10;
const EVENT_REPOS_LIMIT_PER_ACCOUNT = 5;

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
  const rateRemaining = res.headers.get("x-ratelimit-remaining");
  const rateReset = res.headers.get("x-ratelimit-reset");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }
  return {
    data: await res.json(),
    rateRemaining: rateRemaining ? Number.parseInt(rateRemaining, 10) : null,
    rateReset: rateReset
      ? new Date(Number.parseInt(rateReset, 10) * 1000).toISOString()
      : null,
  };
}

async function ghGraphQL(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<unknown> {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "mission-control",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GraphQL ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
  if (body.errors?.length) {
    throw new Error(
      `GitHub GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return body.data;
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
  language: string | null;
  stargazers_count: number;
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

function classifyEvent(raw: RawEvent, account: string): GithubEvent | null {
  const repoName = raw.repo?.name ?? "unknown";
  const actor = raw.actor?.login ?? "unknown";
  const id = `${account}:${repoName}:${raw.id}`;
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
      const headSha = payload?.head ?? commits[commits.length - 1]?.sha ?? null;
      const inlineMessage = commits[commits.length - 1]?.message?.split("\n")[0] ?? null;
      const size = payload?.size ?? (commits.length || null);
      const sizeText = size != null ? `${size} commit${size === 1 ? "" : "s"} to ${branch}` : `Push to ${branch}`;
      return {
        id,
        kind: "push",
        account,
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
        account,
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
        account,
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
        account,
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
        account,
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
        account,
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
        account,
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
        account,
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

function levelFromContribLevel(value: string): 0 | 1 | 2 | 3 | 4 {
  switch (value) {
    case "FIRST_QUARTILE":
      return 1;
    case "SECOND_QUARTILE":
      return 2;
    case "THIRD_QUARTILE":
      return 3;
    case "FOURTH_QUARTILE":
      return 4;
    default:
      return 0;
  }
}

const CONTRIB_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

async function fetchContributions(
  login: string,
  token: string,
): Promise<GithubContributionCalendar | null> {
  const data = (await ghGraphQL(CONTRIB_QUERY, { login }, token)) as
    | {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: {
              totalContributions: number;
              weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
            };
          };
        };
      }
    | undefined;
  const cal = data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) return null;
  const weeks: GithubContributionDay[][] = cal.weeks.map((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: levelFromContribLevel(d.contributionLevel),
    })),
  );
  return { totalContributions: cal.totalContributions, weeks };
}

async function fetchAuthUser(token: string): Promise<string | null> {
  try {
    const res = await ghFetch(`${API}/user`, token);
    const data = res.data as { login?: string };
    return data.login ?? null;
  } catch {
    return null;
  }
}

async function fetchAccount(
  login: string,
  authUser: string | null,
  token: string,
): Promise<{ data: GithubAccountData; rateRemaining: number | null; rateReset: string | null }> {
  let rateRemaining: number | null = null;
  let rateReset: string | null = null;
  const isAuthUser = authUser != null && authUser.toLowerCase() === login.toLowerCase();

  try {
    // For the auth user, /user/repos returns private repos. For other accounts
    // we can only see public repos via /users/{login}/repos.
    const reposUrl = isAuthUser
      ? `${API}/user/repos?per_page=100&sort=pushed&direction=desc&affiliation=owner,organization_member`
      : `${API}/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&direction=desc`;
    const reposRes = await ghFetch(reposUrl, token);
    rateRemaining = reposRes.rateRemaining;
    rateReset = reposRes.rateReset;

    const loginLower = login.toLowerCase();
    const repoList = (reposRes.data as RawRepo[])
      .filter((r) => !r.archived && !r.fork)
      .filter((r) => (r.owner?.login ?? "").toLowerCase() === loginLower);

    const repos: GithubRepo[] = repoList.map((r) => ({
      account: login,
      name: r.name,
      fullName: r.full_name,
      isPrivate: r.private,
      pushedAt: r.pushed_at,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stargazers: r.stargazers_count ?? 0,
    }));

    const eventTargets = repoList.slice(0, EVENT_REPOS_LIMIT_PER_ACCOUNT);
    const eventResults = await Promise.allSettled(
      eventTargets.map((r) =>
        ghFetch(`${API}/repos/${r.full_name}/events?per_page=20`, token),
      ),
    );

    const events: GithubEvent[] = [];
    for (const result of eventResults) {
      if (result.status !== "fulfilled") continue;
      rateRemaining = result.value.rateRemaining ?? rateRemaining;
      rateReset = result.value.rateReset ?? rateReset;
      for (const raw of result.value.data as RawEvent[]) {
        const classified = classifyEvent(raw, login);
        if (classified) events.push(classified);
      }
    }
    events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    let contributions: GithubContributionCalendar | null = null;
    try {
      contributions = await fetchContributions(login, token);
    } catch (err) {
      console.error(`github: contributions fetch failed for ${login}:`, err);
    }

    return {
      data: {
        login,
        htmlUrl: `https://github.com/${login}`,
        isAuthUser,
        repos,
        events,
        contributions,
        errorMessage: null,
      },
      rateRemaining,
      rateReset,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: {
        login,
        htmlUrl: `https://github.com/${login}`,
        isAuthUser,
        repos: [],
        events: [],
        contributions: null,
        errorMessage: message,
      },
      rateRemaining,
      rateReset,
    };
  }
}

function parseAccounts(): string[] {
  const fromAccounts = process.env.GITHUB_ACCOUNTS;
  if (fromAccounts) {
    return fromAccounts
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  const fromOrg = process.env.GITHUB_ORG;
  if (fromOrg) return [fromOrg.trim()];
  return [];
}

export async function getGithubFeed(): Promise<GithubFeedSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.snapshot;

  const token = process.env.GITHUB_TOKEN ?? "";
  const accounts = parseAccounts();
  const fetchedAt = new Date().toISOString();

  if (!token) {
    const snapshot: GithubFeedSnapshot = {
      configured: false,
      accounts: accounts.map((login) => ({
        login,
        htmlUrl: `https://github.com/${login}`,
        isAuthUser: false,
        repos: [],
        events: [],
        contributions: null,
        errorMessage: null,
      })),
      events: [],
      rateRemaining: null,
      rateReset: null,
      fetchedAt,
      errorMessage: null,
    };
    cache = { snapshot, at: now };
    return snapshot;
  }

  const authUser = await fetchAuthUser(token);
  const accountResults = await Promise.all(
    accounts.map((login) => fetchAccount(login, authUser, token)),
  );

  let lastRateRemaining: number | null = null;
  let lastRateReset: string | null = null;
  const accountData: GithubAccountData[] = [];
  for (const r of accountResults) {
    if (r.rateRemaining != null) lastRateRemaining = r.rateRemaining;
    if (r.rateReset != null) lastRateReset = r.rateReset;
    accountData.push(r.data);
  }

  const allEvents: GithubEvent[] = accountData.flatMap((a) => a.events);
  allEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Enrich top push events with commit messages (fine-grained PATs strip
  // commits[] from PushEvent payloads, so we fetch the head commit explicitly).
  const enrichTargets: { event: GithubEvent; sha: string }[] = [];
  for (const e of allEvents) {
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
      const data = r.value.data as { commit?: { message?: string } } | undefined;
      const message = data?.commit?.message?.split("\n")[0]?.trim();
      if (message) enrichTargets[i].event.detail = message;
    }
  }

  const snapshot: GithubFeedSnapshot = {
    configured: true,
    accounts: accountData,
    events: allEvents.slice(0, 50),
    rateRemaining: lastRateRemaining,
    rateReset: lastRateReset,
    fetchedAt,
    errorMessage: null,
  };
  cache = { snapshot, at: now };
  return snapshot;
}
