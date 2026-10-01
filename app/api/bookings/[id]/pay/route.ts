import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings } from "@/db/schema";
import { payTowards } from "@/lib/bookings";

// POST /api/bookings/[id]/pay { kind: "due" | "balance", simulate?: "failed" }
// "due" retries the outstanding deposit/full amount; "balance" pays the remainder.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    if (!["due", "balance"].includes(body?.kind)) {
      return NextResponse.json({ error: 'kind must be "due" or "balance"' }, { status: 400 });
    }
    const b = (await db.select().from(bookings).where(eq(bookings.id, params.id)))[0];
    if (!b || b.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const result = await payTowards({
      bookingId: b.id,
      userId: session.user.id,
      email: session.user.email,
      kind: body.kind,
      simulate: process.env.PAYSTACK_SECRET_KEY ? undefined : body.simulate
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Payment failed" }, { status });
  }
}
