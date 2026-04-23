import { readMarkdown } from "../vault";
import type { AgentEntry, AgentField, AgentsSnapshot } from "../types";

const AGENTS_PATH = "Core/Context/Agents.md";
const PLACEHOLDER_RE = /<fill in\b[^>]*>/i;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Section = { title: string; body: string };

function splitByHeading(body: string, level: 2 | 3): Section[] {
  const re = level === 2 ? /^##\s+(.+?)\s*$/ : /^###\s+(.+?)\s*$/;
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const match = line.match(re);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ title: s.title, body: s.body.trim() }));
}

function parseFields(body: string): { fields: AgentField[]; rest: string } {
  const lines = body.split(/\r?\n/);
  const fields: AgentField[] = [];
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  while (i < lines.length) {
    const match = lines[i].match(/^-\s+\*\*([^*]+)\*\*:\s*(.*)$/);
    if (!match) break;
    fields.push({
      label: match[1].trim(),
      value: match[2].trim(),
      isPlaceholder: PLACEHOLDER_RE.test(match[2]),
    });
    i++;
  }
  return { fields, rest: lines.slice(i).join("\n").trim() };
}

export async function getAgents(): Promise<AgentsSnapshot> {
  let file;
  try {
    file = await readMarkdown(AGENTS_PATH);
  } catch {
    return {
      mission: { body: "", hasPlaceholder: false },
      roster: [],
      routing: null,
      exists: false,
      relativePath: AGENTS_PATH,
    };
  }

  const sections = splitByHeading(file.body, 2);
  const find = (name: string): string =>
    sections.find((s) => s.title.toLowerCase() === name.toLowerCase())?.body ?? "";

  const missionBody = find("Mission");
  const rosterBody = find("Roster");
  const routingBody = find("Routing rules");

  const roster: AgentEntry[] = splitByHeading(rosterBody, 3).map((s) => {
    const { fields, rest } = parseFields(s.body);
    const bodyHasPlaceholder = PLACEHOLDER_RE.test(rest);
    const fieldHasPlaceholder = fields.some((f) => f.isPlaceholder);
    return {
      name: s.title,
      slug: slugify(s.title),
      fields,
      body: rest,
      hasPlaceholder: bodyHasPlaceholder || fieldHasPlaceholder,
    };
  });

  return {
    mission: {
      body: missionBody,
      hasPlaceholder: PLACEHOLDER_RE.test(missionBody),
    },
    roster,
    routing: routingBody || null,
    exists: true,
    relativePath: AGENTS_PATH,
  };
}
