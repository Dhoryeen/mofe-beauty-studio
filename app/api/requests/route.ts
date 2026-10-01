import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings } from "@/db/schema";
import { createRequest } from "@/lib/requests";

function err(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
}

// Requests are bookings with status `request` — a date ask, never a confirmation.
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const all = await db.select().from(bookings).where(eq(bookings.status, "request")).orderBy(desc(bookings.createdAt));
  const rows = role === "manager" ? all : all.filter((b) => b.userId === session.user.id);
  return NextResponse.json({ requests: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await createRequest({
      userId: session.user.id,
      serviceId: body.serviceId,
      lookId: body.lookId ?? undefined,
      staffId: body.staffId && body.staffId !== "match" ? body.staffId : undefined,
      location: body.location ?? undefined,
      slotStart: body.slotStart,
      readinessDeadline: body.readinessDeadline ?? undefined,
      preferredTime: body.preferredTime ?? undefined,
      groupId: body.groupId ?? undefined
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return err(e);
  }
}
