import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, quotes, services } from "@/db/schema";
import { acceptRequest, declineRequest, extendHold, holdExpired } from "@/lib/requests";

function err(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const rows = await db.select().from(bookings).where(eq(bookings.id, params.id));
  const b = rows[0];
  if (!b || (b.userId !== session.user.id && role !== "manager")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const qs = await db.select().from(quotes).where(eq(quotes.bookingId, b.id));
  return NextResponse.json({
    request: { ...b, holdExpired: holdExpired(b) },
    serviceName: svc?.name ?? "",
    quotes: qs
  });
}

// Manager: { action: "accept", travelNaira?, note? } | { action: "decline" } | { action: "extend", hours }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });
  try {
    const body = await req.json();
    if (body.action === "accept") {
      const result = await acceptRequest(session.user.id, params.id, {
        travelNaira: Number(body.travelNaira) || 0,
        note: body.note ?? ""
      });
      return NextResponse.json(result, { status: 201 });
    }
    if (body.action === "decline") {
      return NextResponse.json(await declineRequest(params.id));
    }
    if (body.action === "extend") {
      return NextResponse.json(await extendHold(params.id, Number(body.hours) || 48));
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return err(e);
  }
}
