import { readMarkdown } from "../vault";
import type { Project } from "../types";

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function extractField(body: string, label: string): string | null {
  const re = new RegExp(`^-\\s+\\*\\*${label}\\*\\*:\\s*(.+?)\\s*$`, "im");
  const match = body.match(re);
  if (!match) return null;
  return match[1].replace(/^\*\*|\*\*$/g, "").trim() || null;
}

function extractRepoUrl(body: string): string | null {
  const re = /^-\s+\*\*Repo\*\*:\s*\[[^\]]+\]\(([^)]+)\)/im;
  return body.match(re)?.[1] ?? null;
}

function classifyStatus(status: string | null): Project["statusTone"] {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s.startsWith("shelved") || s.startsWith("paused")) return "shelved";
  if (s.startsWith("planning") || s.startsWith("idea")) return "planning";
  if (
    s.startsWith("active") ||
    s.startsWith("live") ||
    s.includes("milestone") ||
    s.includes("in progress")
  ) {
    return "active";
  }
  return "unknown";
}

export async function getProjects(): Promise<Project[]> {
  const file = await readMarkdown("Core/Context/Projects.md");
  const lines = file.body.split(/\r?\n/);
  const projects: Project[] = [];
  let current: { name: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (body) {
      const status = extractField(body, "Status");
      projects.push({
        slug: slugify(current.name),
        name: current.name,
        body,
        raw: `## ${current.name}\n\n${body}`,
        status,
        statusTone: classifyStatus(status),
        type: extractField(body, "Type"),
        nextAction: extractField(body, "Next action"),
        repoUrl: extractRepoUrl(body),
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
