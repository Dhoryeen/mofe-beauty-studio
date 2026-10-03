import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookingStaff, bookings } from "@/db/schema";
import { bookingProgress } from "@/lib/progress";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const b = (await db.select().from(bookings).where(eq(bookings.id, params.id)))[0];
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed =
    b.userId === session.user.id ||
    role === "manager" ||
    (role === "beautician_consultant" &&
      (await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id))).some((l) => l.staffId === session.user.id));
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await bookingProgress(b.id));
}
