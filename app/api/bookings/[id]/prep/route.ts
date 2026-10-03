import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookingStaff, bookings, prepTasks, progressUpdates } from "@/db/schema";
import { delayNoticeEmail, sendEmail } from "@/lib/email";
import { user } from "@/db/schema";

async function staffAccess(bookingId: string, userId: string, role?: string) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b) return null;
  if (role === "manager") return b;
  if (role === "beautician_consultant") {
    const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id));
    if (links.some((l) => l.staffId === userId)) return b;
    return null;
  }
  return b.userId === userId ? b : null;
}

// GET tasks + updates for the booking (owner, assigned staff, manager).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const b = await staffAccess(params.id, session.user.id, role);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tasks = await db.select().from(prepTasks).where(eq(prepTasks.bookingId, b.id));
  const updates = await db.select().from(progressUpdates).where(eq(progressUpdates.bookingId, b.id)).orderBy(desc(progressUpdates.createdAt));
  return NextResponse.json({ tasks, updates: [...updates].reverse() });
}

// POST { action: "task", title, owner, dueAt? } (staff/manager, or owner for own tasks)
//     { action: "task-done", id } (task owner side or studio)
//     { action: "update", body, imageUrl? } (staff/manager; kind "delay" notifies promptly)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const body = await req.json();
  const b = await staffAccess(params.id, session.user.id, role);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isStudio = role === "manager" || role === "beautician_consultant";

  if (body.action === "task") {
    if (!isStudio) return NextResponse.json({ error: "Studio only" }, { status: 403 });
    if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
    const id = randomUUID();
    await db.insert(prepTasks).values({
      id,
      bookingId: b.id,
      title: body.title.trim(),
      owner: body.owner === "client" ? "client" : "studio",
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      createdBy: session.user.id
    });
    return NextResponse.json({ id }, { status: 201 });
  }
  if (body.action === "task-done") {
    const rows = await db.select().from(prepTasks).where(eq(prepTasks.id, body.id));
    const t = rows[0];
    if (!t || t.bookingId !== b.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isStudio && !(t.owner === "client" && b.userId === session.user.id)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    await db.update(prepTasks).set({ status: body.done === false ? "open" : "done" }).where(eq(prepTasks.id, t.id));
    return NextResponse.json({ ok: true });
  }
  if (body.action === "update") {
    if (!isStudio) return NextResponse.json({ error: "Studio only" }, { status: 403 });
    if (!body.body?.trim()) return NextResponse.json({ error: "Empty update" }, { status: 400 });
    const id = randomUUID();
    await db.insert(progressUpdates).values({
      id,
      bookingId: b.id,
      authorId: session.user.id,
      body: body.body.trim(),
      imageUrl: body.imageUrl ?? null,
      kind: body.kind === "delay" ? "delay" : "update"
    });
    if (body.kind === "delay") {
      const u = (await db.select().from(user).where(eq(user.id, b.userId)))[0];
      if (u?.email) {
        const m = delayNoticeEmail({ name: u.name, service: "your appointment", body: body.body.trim(), bookingId: b.id });
        await sendEmail({ to: u.email, subject: m.subject, html: m.html });
      }
    }
    return NextResponse.json({ id }, { status: 201 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
