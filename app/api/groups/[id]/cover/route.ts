import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, groups } from "@/db/schema";
import { coverBooking } from "@/lib/groups";

// POST /api/groups/[id]/cover { bookingId } — organiser pays a member's amount owed.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const g = (await db.select().from(groups).where(eq(groups.id, params.id)))[0];
    if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (g.organiserId !== session.user.id) return NextResponse.json({ error: "Organisers only" }, { status: 403 });
    const target = (await db.select().from(bookings).where(eq(bookings.id, body.bookingId)))[0];
    if (!target || target.groupId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const result = await coverBooking(session.user.id, params.id, target.id, session.user.email, process.env.PAYSTACK_SECRET_KEY ? undefined : body.simulate);
    if (result.authorizationUrl) return NextResponse.json(result, { status: 201 });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
