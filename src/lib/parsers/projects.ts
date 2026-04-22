import { readMarkdown } from "../vault";
import type { Project } from "../types";

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function getProjects(): Promise<Project[]> {
  const file = await readMarkdown("Core/Context/Projects.md");
  const lines = file.body.split(/\r?\n/);
  const projects: Project[] = [];
  let current: { name: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (body) {
      projects.push({
        slug: slugify(current.name),
        name: current.name,
        body,
        raw: `## ${current.name}\n\n${body}`,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const h2 = line.match(/^## (.+?)\s*$/);
    if (h2) {
      flush();
      current = { name: h2[1], lines: [] };
    } else if (current) {
      if (line.trim() === "---") continue;
      current.lines.push(line);
    }
  }
  flush();
  return projects;
}
