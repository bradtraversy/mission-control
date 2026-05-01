import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { DigestSummary } from "@/components/research/DigestSummary";
import { YoutubeIdeasSection } from "@/components/research/YoutubeIdeasSection";
import {
  buildObsidianUri,
  getDigests,
  getYoutubeIdeas,
  ideaSourcedFromDigest,
} from "@/lib";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function Page({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const [digests, allIdeas] = await Promise.all([getDigests(), getYoutubeIdeas()]);
  const digest = digests.find((d) => d.date === date);
  if (!digest) notFound();

  const ideas = allIdeas.filter((i) => ideaSourcedFromDigest(i, date));
  const topics = digest.frontmatter.topics ?? [];

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Link
        href="/research"
        className="text-[13px] text-muted hover:text-foreground"
      >
        ← Back to Research
      </Link>

      <header className="pb-4 border-b border-border space-y-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-xl font-medium tracking-tight font-mono">
            {date}
          </h1>
          {digest.frontmatter.generated_by && (
            <span className="text-[12px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2">
              {digest.frontmatter.generated_by}
            </span>
          )}
          <a
            href={buildObsidianUri(digest.relativePath)}
            className="ml-auto text-[13px] text-muted hover:text-foreground"
          >
            Edit in Obsidian ↗
          </a>
        </div>
        {topics.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {topics.map((t) => (
              <span
                key={t}
                className="text-[12px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2 font-mono"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </header>

      <DigestSummary body={digest.body} />

      {ideas.length > 0 && (
        <div className="pt-4 border-t border-border">
          <YoutubeIdeasSection
            ideas={ideas}
            obsidianUris={Object.fromEntries(
              ideas.map((i) => [
                i.relativePath,
                buildObsidianUri(i.relativePath),
              ]),
            )}
          />
        </div>
      )}

      <details className="pt-4 border-t border-border">
        <summary className="text-[13px] font-medium tracking-[0.15em] uppercase text-muted cursor-pointer hover:text-foreground">
          Full digest body (with Brad-angle annotations)
        </summary>
        <div className="mt-3">
          <MarkdownBody content={digest.body} />
        </div>
      </details>
    </div>
  );
}
