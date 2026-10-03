import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings } from "@/db/schema";
import { cancelBooking, cancelPreview } from "@/lib/changes";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const b = (await db.select().from(bookings).where(eq(bookings.id, params.id)))[0];
  if (!b || b.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await cancelPreview(b.id));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await cancelBooking(session.user.id, params.id, body.reason));
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
