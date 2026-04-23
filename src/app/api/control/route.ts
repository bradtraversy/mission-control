import { NextResponse } from "next/server";
import { setPaused } from "@/lib/writers/tasks";

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { paused?: boolean }
    | null;
  if (!body || typeof body.paused !== "boolean") {
    return NextResponse.json(
      { error: "body.paused (boolean) required" },
      { status: 400 },
    );
  }
  try {
    await setPaused(body.paused);
    return NextResponse.json({ ok: true, paused: body.paused });
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
