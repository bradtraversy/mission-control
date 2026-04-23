import { NextResponse } from "next/server";
import { moveTodo, setTodoDone } from "@/lib/writers/todos";
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
    | { done?: boolean; column?: string }
    | null;
  if (!body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const hasDone = typeof body.done === "boolean";
  const hasColumn = typeof body.column === "string";
  if (hasDone === hasColumn) {
    return NextResponse.json(
      { error: "body must include exactly one of {done, column}" },
      { status: 400 },
    );
  }

  try {
    if (hasDone) {
      await setTodoDone(column as TodoColumn, idNum, body.done as boolean);
    } else {
      const target = body.column as TodoColumn;
      if (!VALID_COLUMNS.has(target)) {
        return NextResponse.json(
          { error: "invalid target column" },
          { status: 400 },
        );
      }
      await moveTodo(column as TodoColumn, idNum, target);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
