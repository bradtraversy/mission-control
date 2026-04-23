import { NextResponse } from "next/server";
import { setTaskStatus } from "@/lib/writers/tasks";
import type { TaskStatus } from "@/lib/types";

const VALID_STATUSES: ReadonlySet<TaskStatus> = new Set(["queued", "claimed", "done"]);

type Params = {
  params: Promise<{ filename: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { filename } = await params;

  const body = (await request.json().catch(() => null)) as
    | { status?: string }
    | null;
  if (!body || !VALID_STATUSES.has(body.status as TaskStatus)) {
    return NextResponse.json(
      { error: "body.status must be queued | claimed | done" },
      { status: 400 },
    );
  }

  try {
    await setTaskStatus(filename, body.status as TaskStatus);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
