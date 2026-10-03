import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, reviews } from "@/db/schema";
import { submitReview } from "@/lib/changes";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const b = (await db.select().from(bookings).where(eq(bookings.id, params.id)))[0];
  if (!b || b.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(reviews).where(eq(reviews.bookingId, b.id));
  return NextResponse.json({ review: rows[0] ?? null });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    return NextResponse.json(await submitReview(session.user.id, params.id, body.rating, body.body, body.publishConsent), { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
