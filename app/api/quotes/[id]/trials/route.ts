import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bookTrial } from "@/lib/quotes";

// POST /api/quotes/[id]/trials { slotStart, staffId? } — client books a paid trial.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await bookTrial({
      userId: session.user.id,
      email: session.user.email,
      quoteId: params.id,
      staffId: body.staffId && body.staffId !== "match" ? body.staffId : undefined,
      slotStart: body.slotStart,
      simulate: process.env.PAYSTACK_SECRET_KEY ? undefined : body.simulate
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
