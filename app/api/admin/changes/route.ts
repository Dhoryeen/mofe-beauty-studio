import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, refunds, rescheduleRequests, user } from "@/db/schema";

async function manager() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") return null;
  return session;
}

// GET /api/admin/changes — pending reschedule asks + refunds with booking context.
export async function GET() {
  const session = await manager();
  if (!session?.user) return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const reschedules = await db.select().from(rescheduleRequests).where(eq(rescheduleRequests.status, "pending")).orderBy(desc(rescheduleRequests.createdAt));
  const refundRows = await db.select().from(refunds).where(eq(refunds.status, "pending")).orderBy(desc(refunds.createdAt));
  async function context(bookingId: string) {
    const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
    const u = b ? (await db.select().from(user).where(eq(user.id, b.userId)))[0] : undefined;
    return { slotStart: b?.slotStart ?? null, email: u?.email ?? "", totalNaira: b?.totalNaira ?? 0, paidNaira: b?.paidNaira ?? 0 };
  }
  return NextResponse.json({
    reschedules: await Promise.all(reschedules.map(async (r) => ({ ...r, ...(await context(r.bookingId)) }))),
    refunds: await Promise.all(refundRows.map(async (r) => ({ ...r, ...(await context(r.bookingId)) })))
  });
}
