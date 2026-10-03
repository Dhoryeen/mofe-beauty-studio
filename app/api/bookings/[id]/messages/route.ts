import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookingStaff, bookings, messages } from "@/db/schema";

async function access(bookingId: string, userId: string, role?: string) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b) return null;
  if (b.userId === userId || role === "manager") return b;
  if (role === "beautician_consultant") {
    const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id));
    if (links.some((l) => l.staffId === userId)) return b;
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const b = await access(params.id, session.user.id, role);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(messages).where(eq(messages.bookingId, b.id)).orderBy(desc(messages.createdAt));
  return NextResponse.json({ messages: [...rows].reverse() });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const b = await access(params.id, session.user.id, role);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  if (!body?.body?.trim() && !body?.imageUrl) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const { randomUUID } = await import("crypto");
  const id = randomUUID();
  await db.insert(messages).values({
    id,
    bookingId: b.id,
    authorId: session.user.id,
    body: body.body?.trim() ?? "",
    imageUrl: body.imageUrl ?? null
  });
  return NextResponse.json({ id }, { status: 201 });
}
