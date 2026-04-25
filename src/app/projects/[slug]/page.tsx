import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { buildObsidianUri, getProjects } from "@/lib";
import type { Project } from "@/lib";

const TONE_STYLE: Record<Project["statusTone"], string> = {
  active: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  planning: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  shelved: "bg-surface-2 text-muted border-border",
  unknown: "bg-surface-2 text-muted border-border",
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const obsidianUri = buildObsidianUri("Core/Context/Projects.md");

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Link
        href="/projects"
        className="text-[12px] text-muted hover:text-foreground"
      >
        ← Back to projects
      </Link>

      <header className="space-y-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-medium tracking-tight">{project.name}</h1>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded border ${TONE_STYLE[project.statusTone]}`}
          >
            {project.statusTone}
          </span>
          <a
            href={obsidianUri}
            className="ml-auto text-[12px] text-muted hover:text-foreground"
          >
            Edit in Obsidian ↗
          </a>
        </div>
        {project.type && (
          <p className="text-[13px] text-muted">{project.type}</p>
        )}
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[12px] text-accent hover:underline"
          >
            {project.repoUrl} ↗
          </a>
        )}
      </header>

      <MarkdownBody content={project.body} />
    </div>
  );
}
