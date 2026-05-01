import { NextResponse } from "next/server";
import {
  isSafeIdeaFilename,
  isValidIdeaStatus,
  setYoutubeIdeaStatus,
} from "@/lib/writers/youtubeIdeas";

type Params = {
  params: Promise<{ filename: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { filename } = await params;
  if (!isSafeIdeaFilename(filename)) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: string }
    | null;
  if (!body || typeof body.status !== "string" || !isValidIdeaStatus(body.status)) {
    return NextResponse.json(
      { error: "body.status must be idea | consider | shortlist | dropped" },
      { status: 400 },
    );
  }

  try {
    await setYoutubeIdeaStatus(filename, body.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
