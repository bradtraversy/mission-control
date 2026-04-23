import { NextResponse } from "next/server";
import { setTodoDone } from "@/lib/writers/todos";
import type { TodoColumn } from "@/lib/types";

const VALID_COLUMNS: ReadonlySet<TodoColumn> = new Set(["now", "soon", "later"]);

type Params = {
  params: Promise<{ column: string; id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { column, id } = await params;
  if (!VALID_COLUMNS.has(column as TodoColumn)) {
    return NextResponse.json({ error: "invalid column" }, { status: 400 });
  }
  const idNum = Number.parseInt(id, 10);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { done?: boolean }
    | null;
  if (!body || typeof body.done !== "boolean") {
    return NextResponse.json(
      { error: "body.done (boolean) is required" },
      { status: 400 },
    );
  }

  try {
    await setTodoDone(column as TodoColumn, idNum, body.done);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
