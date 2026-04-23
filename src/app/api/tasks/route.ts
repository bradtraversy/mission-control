import { NextResponse } from "next/server";
import { addTask } from "@/lib/writers/tasks";
import type { TaskAgent } from "@/lib/types";

const VALID_AGENTS: ReadonlySet<TaskAgent> = new Set([
  "travis",
  "claude-code",
  "claude-cowork",
  "brad",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { title?: string; agent?: string; body?: string }
    | null;
  if (!body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (typeof body.title !== "string" || body.title.trim() === "") {
    return NextResponse.json({ error: "title (non-empty string) required" }, { status: 400 });
  }
  if (!VALID_AGENTS.has(body.agent as TaskAgent)) {
    return NextResponse.json({ error: "valid agent required" }, { status: 400 });
  }

  try {
    const result = await addTask({
      title: body.title,
      agent: body.agent as TaskAgent,
      body: typeof body.body === "string" ? body.body : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
