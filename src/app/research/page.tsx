import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { buildObsidianUri, getDigests } from "@/lib";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const digests = await getDigests();
  const { date: requestedDate } = await searchParams;

  if (digests.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Research</h1>
          <p className="text-[14px] text-muted">
            No digests in <code>Research/Digests/</code> yet.
          </p>
        </header>
      </div>
    );
  }

  const selected = requestedDate
    ? digests.find((d) => d.date === requestedDate)
    : digests[0];

  if (!selected) notFound();

  const selectedDate = selected.date ?? "";
  const topics = selected.frontmatter.topics ?? [];

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Research</h1>
        <p className="text-[14px] text-muted">
          {digests.length} {digests.length === 1 ? "digest" : "digests"} ·
          newest first
        </p>
      </header>

      <div className="flex items-center gap-1.5 flex-wrap">
        {digests.map((d, i) => {
          const dDate = d.date ?? "";

          const isActive = dDate === selectedDate;
          const isLatest = i === 0;
          const href = isLatest ? "/research" : `/research?date=${dDate}`;
          return (
            <Link
              key={d.relativePath}
              href={href}
              className={`text-[13px] px-2 py-1 rounded border font-mono transition-colors ${
                isActive
                  ? "bg-accent/15 border-accent/40 text-foreground"
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              {dDate}
            </Link>
          );
        })}
      </div>

      <div className="pb-4 border-b border-border space-y-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-[13px] text-muted font-mono">
            {selectedDate}
          </span>
          {selected.frontmatter.generated_by && (
            <span className="text-[12px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2">
              {selected.frontmatter.generated_by}
            </span>
          )}
          <a
            href={buildObsidianUri(selected.relativePath)}
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
                className="text-[12px] text-muted/80 px-1.5 py-0.5 rounded bg-surface-2"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <MarkdownBody content={selected.body} />
    </div>
  );
}
