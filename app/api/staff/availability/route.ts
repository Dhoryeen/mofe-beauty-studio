import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { availabilityExceptions, availabilityRules } from "@/db/schema";

function who(session: { user: unknown }) {
  return { id: (session.user as { id: string }).id, role: (session.user as { role?: string } | undefined)?.role };
}

// Resolves whose schedule is being managed: self for beauticians, ?staffId= for managers.
async function target(req: Request, me: { id: string; role?: string }) {
  const staffId = new URL(req.url).searchParams.get("staffId");
  if (staffId && me.role === "manager") return staffId;
  if (me.role !== "manager" && me.role !== "beautician_consultant") return null;
  return me.id;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const me = who(session);
  const id = await target(req, me);
  if (!id) return NextResponse.json({ error: "Studio only" }, { status: 403 });
  const rules = await db.select().from(availabilityRules).where(eq(availabilityRules.staffId, id));
  const exceptions = await db.select().from(availabilityExceptions).where(eq(availabilityExceptions.staffId, id));
  return NextResponse.json({ staffId: id, rules, exceptions });
}

// POST { type: "rule", weekday, startMin, endMin } — replaces that weekday's hours.
// POST { type: "exception", day, startMin?, endMin?, reason } — blocks time off.
// Never touches existing bookings: booked slots stay valid even if hours shrink.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const me = who(session);
  const body = await req.json();
  const id = body.staffId && me.role === "manager" ? body.staffId : me.id;
  if (me.role !== "manager" && me.role !== "beautician_consultant") {
    return NextResponse.json({ error: "Studio only" }, { status: 403 });
  }
  if (body.type === "rule") {
    const { weekday, startMin, endMin } = body;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !(startMin < endMin) || startMin < 0 || endMin > 1440) {
      return NextResponse.json({ error: "Invalid hours" }, { status: 400 });
    }
    await db.delete(availabilityRules).where(and(eq(availabilityRules.staffId, id), eq(availabilityRules.weekday, weekday)));
    const row = { id: randomUUID(), staffId: id, weekday, startMin, endMin };
    await db.insert(availabilityRules).values(row);
    return NextResponse.json({ rule: row }, { status: 201 });
  }
  if (body.type === "exception") {
    if (!body.day || !/^\d{4}-\d{2}-\d{2}$/.test(body.day)) return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    const row = {
      id: randomUUID(),
      staffId: id,
      day: body.day,
      startMin: body.startMin ?? null,
      endMin: body.endMin ?? null,
      reason: body.reason ?? ""
    };
    await db.insert(availabilityExceptions).values(row);
    return NextResponse.json({ exception: row }, { status: 201 });
  }
  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const me = who(session);
  if (me.role !== "manager" && me.role !== "beautician_consultant") {
    return NextResponse.json({ error: "Studio only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const kind = url.searchParams.get("kind");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (kind === "rule") {
    const rows = await db.select().from(availabilityRules).where(eq(availabilityRules.id, id));
    if (!rows[0] || (rows[0].staffId !== me.id && me.role !== "manager")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.delete(availabilityRules).where(eq(availabilityRules.id, id));
    return NextResponse.json({ ok: true });
  }
  const rows = await db.select().from(availabilityExceptions).where(eq(availabilityExceptions.id, id));
  if (!rows[0] || (rows[0].staffId !== me.id && me.role !== "manager")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.delete(availabilityExceptions).where(eq(availabilityExceptions.id, id));
  return NextResponse.json({ ok: true });
}
