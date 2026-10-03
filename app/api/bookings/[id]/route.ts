import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookingStaff, bookings, payments, services, user } from "@/db/schema";
import { requestReschedule } from "@/lib/changes";

async function owned(id: string, userId: string, role?: string) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, id));
  const b = rows[0];
  if (!b) return null;
  if (b.userId !== userId && role !== "manager") return null;
  return b;
}

function roleOf(session: { user: unknown }) {
  return (session.user as { role?: string } | undefined)?.role;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const b = await owned(params.id, session.user.id, roleOf(session));
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id));
  const staff = await Promise.all(
    links.map(async (l) => {
      const u = (await db.select().from(user).where(eq(user.id, l.staffId)))[0];
      return { id: l.staffId, name: u?.name ?? "Specialist", kind: l.kind };
    })
  );
  const pays = await db.select().from(payments).where(eq(payments.bookingId, b.id));
  return NextResponse.json({ booking: b, service: svc, staff, payments: pays });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body?.slotStart) return NextResponse.json({ error: "slotStart required" }, { status: 400 });
    // Only the owner reschedules here; managers handle exceptions elsewhere.
    const b = await owned(params.id, session.user.id, undefined);
    if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Policy routing: free instant self-serve, or a manager-approval request
    // that keeps the original slot confirmed meanwhile.
    const result = await requestReschedule(session.user.id, b.id, body.slotStart);
    return NextResponse.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Reschedule failed" }, { status });
  }
}
