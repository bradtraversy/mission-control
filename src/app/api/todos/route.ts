import { NextResponse } from "next/server";
import { addTodo } from "@/lib/writers/todos";
import type { TodoColumn } from "@/lib/types";

const VALID_COLUMNS: ReadonlySet<TodoColumn> = new Set(["now", "soon", "later"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { column?: string; input?: string }
    | null;
  if (!body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (typeof body.input !== "string" || body.input.trim() === "") {
    return NextResponse.json({ error: "input (non-empty string) required" }, { status: 400 });
  }
  if (!VALID_COLUMNS.has(body.column as TodoColumn)) {
    return NextResponse.json({ error: "valid column required" }, { status: 400 });
  }

  try {
    const result = await addTodo(body.column as TodoColumn, body.input);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
