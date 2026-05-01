import Link from "next/link";
import { YoutubeIdeasSection } from "@/components/research/YoutubeIdeasSection";
import { buildObsidianUri, getYoutubeIdeas } from "@/lib";

export default async function Page() {
  const ideas = await getYoutubeIdeas();

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <Link
        href="/research"
        className="text-[13px] text-muted hover:text-foreground"
      >
        ← Back to Research
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">All YouTube Ideas</h1>
        <p className="text-[14px] text-muted">
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} across all digests
          · sourced from{" "}
          <code className="text-foreground/80">Research/YouTube/</code>
        </p>
      </header>

      <YoutubeIdeasSection
        ideas={ideas}
        obsidianUris={Object.fromEntries(
          ideas.map((i) => [i.relativePath, buildObsidianUri(i.relativePath)]),
        )}
      />
    </div>
  );
}
