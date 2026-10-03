import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookingStaff, bookings } from "@/db/schema";
import { completeBooking } from "@/lib/changes";

// POST /api/bookings/[id]/complete { aftercare? } — assigned staff or manager.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await completeBooking(session.user.id, params.id, body.aftercare));
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}

// PATCH /api/bookings/[id]/complete { aftercare } — update aftercare notes post-completion.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const b = (await db.select().from(bookings).where(eq(bookings.id, params.id)))[0];
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed =
    role === "manager" ||
    (role === "beautician_consultant" &&
      (await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id))).some((l) => l.staffId === session.user.id));
  if (!allowed) return NextResponse.json({ error: "Studio only" }, { status: 403 });
  const body = await req.json();
  await db.update(bookings).set({ aftercare: body.aftercare ?? "", updatedAt: new Date() }).where(eq(bookings.id, b.id));
  return NextResponse.json({ ok: true });
}
