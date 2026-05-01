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
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Research</h1>
        <p className="text-[14px] text-muted">
          {digests.length} {digests.length === 1 ? "digest" : "digests"} ·{" "}
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} · newest first
        </p>
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
            const lead = extractLead(d.body);
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
                      {topics.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {topics.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2 font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      {lead && (
                        <p className="text-[13px] text-muted leading-snug line-clamp-2">
                          {lead}
                        </p>
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

function extractLead(body: string): string {
  // First non-heading paragraph that's substantive — strip markdown emphasis.
  const lines = body.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith(">") || line.startsWith("-") || line.startsWith("|")) continue;
    return line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\([^)]+\)/g, "$1");
  }
  return "";
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
