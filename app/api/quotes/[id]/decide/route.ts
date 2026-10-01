import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quotes } from "@/db/schema";
import { decideQuote } from "@/lib/quotes";

// POST /api/quotes/[id]/decide { decision: "approved" | "rejected", note? } — client only.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    if (!["approved", "rejected"].includes(body?.decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    await decideQuote(params.id, session.user.id, body.decision, body.note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
