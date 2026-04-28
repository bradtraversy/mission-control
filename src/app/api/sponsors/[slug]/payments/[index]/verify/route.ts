import { NextResponse } from "next/server";
import {
  isSafeSponsorSlug,
  verifySponsorPayment,
} from "@/lib/writers/sponsors";

type Params = {
  params: Promise<{ slug: string; index: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { slug, index } = await params;
  if (!isSafeSponsorSlug(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }
  const rowIndex = Number.parseInt(index, 10);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { date?: string; method?: string; notes?: string }
    | null;

  try {
    await verifySponsorPayment(slug, rowIndex, {
      date: body?.date,
      method: body?.method,
      notes: body?.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "verify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
