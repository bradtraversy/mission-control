import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { buildObsidianUri, getProjects } from "@/lib";
import type { Project } from "@/lib";

const TONE_STYLE: Record<Project["statusTone"], string> = {
  active: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  planning: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  shelved: "bg-surface-2 text-muted border-border",
  unknown: "bg-surface-2 text-muted border-border",
};

function shorten(text: string, max = 80): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export default async function Page() {
  const projects = await getProjects();
  const obsidianUri = buildObsidianUri("Core/Context/Projects.md");

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Projects</h1>
          <p className="text-[14px] text-muted">
            {projects.length} projects · sourced from{" "}
            <code>Core/Context/Projects.md</code>
          </p>
        </div>
        <a
          href={obsidianUri}
          className="text-[13px] text-muted hover:text-foreground"
        >
          Edit in Obsidian ↗
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map((p) => (
          <Link
            key={p.slug}
            href={`/projects/${p.slug}`}
            className="block hover:ring-1 hover:ring-accent/30 rounded-lg transition-shadow"
          >
            <Card className="h-full">
              <CardHeader
                title={p.name}
                action={
                  <span
                    className={`text-[12px] px-1.5 py-0.5 rounded border ${TONE_STYLE[p.statusTone]}`}
                  >
                    {p.statusTone}
                  </span>
                }
              />
              <CardBody className="space-y-2">
                {p.type && (
                  <p className="text-[14px] text-muted line-clamp-2">
                    {shorten(p.type, 120)}
                  </p>
                )}
                {p.status && (
                  <p className="text-[13px] text-foreground/80 line-clamp-2">
                    <span className="text-muted/70">Status: </span>
                    {shorten(p.status, 100)}
                  </p>
                )}
                {p.nextAction && (
                  <p className="text-[13px] text-accent/90 line-clamp-2">
                    <span className="text-muted/70">Next: </span>
                    {shorten(p.nextAction, 100)}
                  </p>
                )}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
