import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import {
  getDigests,
  getYoutubeIdeas,
  ideaSourcedFromDigest,
  type YoutubeIdeaStatus,
} from "@/lib";

export default async function Page() {
  const [digests, ideas] = await Promise.all([getDigests(), getYoutubeIdeas()]);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <header className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Research</h1>
          <p className="text-[14px] text-muted">
            {digests.length} {digests.length === 1 ? "digest" : "digests"} ·{" "}
            {ideas.length} idea{ideas.length === 1 ? "" : "s"} · newest first
          </p>
        </div>
        <Link
          href="/research/ideas"
          className="text-[13px] text-accent hover:underline"
        >
          View all ideas →
        </Link>
      </header>

      {digests.length === 0 ? (
        <p className="text-[14px] text-muted/60 italic">
          No digests in <code>Research/Digests/</code> yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {digests.map((d) => {
            const date = d.date ?? "";
            const topics = d.frontmatter.topics ?? [];
            const sections = extractSections(d.body);
            const headlines = extractHeadlines(d.body, 3);
            const matchingIdeas = date
              ? ideas.filter((i) => ideaSourcedFromDigest(i, date))
              : [];
            const counts = countByStatus(matchingIdeas);
            return (
              <li key={d.relativePath}>
                <Link href={`/research/${date}`} className="block">
                  <Card className="hover:border-accent/40 transition-colors">
                    <CardBody className="space-y-2 pt-4">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <span className="text-[15px] font-medium font-mono text-foreground">
                          {date}
                        </span>
                        <IdeaCountBadges counts={counts} total={matchingIdeas.length} />
                      </div>

                      {sections.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sections.map((s) => (
                            <span
                              key={s}
                              className="text-[11px] text-muted/70 px-1.5 py-0.5 rounded bg-surface-2"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {headlines.length > 0 && (
                        <ul className="space-y-0.5 pt-1">
                          {headlines.map((h, i) => (
                            <li
                              key={i}
                              className="text-[13px] text-foreground/85 leading-snug line-clamp-1"
                            >
                              <span className="text-muted/50 mr-1.5">{h.marker}</span>
                              {h.title}
                            </li>
                          ))}
                        </ul>
                      )}

                      {topics.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {topics.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] text-muted/60 px-1.5 py-0.5 rounded bg-surface-2 font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function extractSections(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[1].trim();
    if (out.length < 4) out.push(heading);
  }
  return out;
}

type Headline = { title: string; marker: string };

function extractHeadlines(body: string, limit: number): Headline[] {
  const out: Headline[] = [];
  // Match list items shaped like `- 🔴 **[Title](url)**` or `- **[Title](url)**`.
  // The `u` flag is required so the emoji character class matches surrogate
  // pairs as single codepoints rather than as individual UTF-16 code units.
  const re = /^\s*-\s*([🔴🟡⚪🆕]?)\s*\*\*\[([^\]]+)\]/u;
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    out.push({ marker: m[1] || "•", title: m[2].trim() });
    if (out.length >= limit) break;
  }
  return out;
}

function countByStatus(
  ideas: { status: YoutubeIdeaStatus }[],
): Record<YoutubeIdeaStatus, number> {
  const c: Record<YoutubeIdeaStatus, number> = {
    idea: 0,
    consider: 0,
    shortlist: 0,
    dropped: 0,
  };
  for (const i of ideas) c[i.status] += 1;
  return c;
}

function IdeaCountBadges({
  counts,
  total,
}: {
  counts: Record<YoutubeIdeaStatus, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <span className="text-[11px] text-muted/60 font-mono">no ideas yet</span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono">
      <span className="text-muted/80">
        {total} idea{total === 1 ? "" : "s"}
      </span>
      {counts.shortlist > 0 && (
        <span className="text-emerald-300">
          · {counts.shortlist} shortlist
        </span>
      )}
      {counts.consider > 0 && (
        <span className="text-amber-300">· {counts.consider} consider</span>
      )}
      {counts.idea > 0 && (
        <span className="text-muted/60">· {counts.idea} pending</span>
      )}
      {counts.dropped > 0 && (
        <span className="text-rose-300/60">· {counts.dropped} dropped</span>
      )}
    </div>
  );
}
