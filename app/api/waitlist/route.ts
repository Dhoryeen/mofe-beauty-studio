import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { services, user, waitlist } from "@/db/schema";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const svc = (await db.select().from(services).where(eq(services.id, body.serviceId)))[0];
  if (!svc) return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  const id = randomUUID();
  await db.insert(waitlist).values({
    id,
    userId: session.user.id,
    serviceId: svc.id,
    dateFrom: body.dateFrom || null,
    dateTo: body.dateTo || null,
    timeRange: body.timeRange || null,
    note: body.note ?? "",
    status: "open"
  });
  // A waitlist alert never books or charges — it only notifies.
  return NextResponse.json({ id }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const rows = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
  const out = await Promise.all(
    rows.map(async (w) => {
      const u = (await db.select().from(user).where(eq(user.id, w.userId)))[0];
      const s = (await db.select().from(services).where(eq(services.id, w.serviceId)))[0];
      return { ...w, email: u?.email ?? "", serviceName: s?.name ?? w.serviceId };
    })
  );
  return NextResponse.json({ waitlist: out });
}
