import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { trials } from "@/db/schema";

// PATCH /api/trials/[id] — staff/manager records feedback + completes; client cancels.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db.select().from(trials).where(eq(trials.id, params.id));
  const t = rows[0];
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const role = (session.user as { role?: string } | undefined)?.role;
  try {
    const body = await req.json();
    if (body.action === "feedback") {
      const allowed = role === "manager" || (role === "beautician_consultant" && (!t.staffId || t.staffId === session.user.id));
      if (!allowed) return NextResponse.json({ error: "Staff only" }, { status: 403 });
      if (t.status !== "booked") return NextResponse.json({ error: "Trial is not booked" }, { status: 400 });
      await db
        .update(trials)
        .set({ feedback: body.feedback ?? "", status: "completed", updatedAt: new Date() })
        .where(eq(trials.id, t.id));
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel") {
      if (t.userId !== session.user.id && role !== "manager") {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      }
      await db.update(trials).set({ status: "cancelled", updatedAt: new Date() }).where(eq(trials.id, t.id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
