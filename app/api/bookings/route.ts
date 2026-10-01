import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings } from "@/db/schema";
import { createBooking } from "@/lib/bookings";

function err(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  const message = e instanceof Error ? e.message : "Booking failed";
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, session.user.id))
    .orderBy(desc(bookings.createdAt));
  return NextResponse.json({ bookings: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await createBooking({
      userId: session.user.id,
      email: session.user.email,
      serviceId: body.serviceId,
      lookId: body.lookId ?? undefined,
      staffIds: Array.isArray(body.staffIds) ? body.staffIds : [],
      slotStart: body.slotStart,
      payMode: body.payMode === "full" ? "full" : "deposit",
      readinessDeadline: body.readinessDeadline ?? undefined,
      preferredTime: body.preferredTime ?? undefined,
      // Dev-only: exercises the failed-payment path on the mock provider.
      simulate: process.env.PAYSTACK_SECRET_KEY ? undefined : body.simulate
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return err(e);
  }
}
