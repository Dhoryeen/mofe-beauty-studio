import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consultationCredits, consultations, payments, user } from "@/db/schema";
import { completeConsultation } from "@/lib/consultations";

function staffOf(session: { user: unknown }) {
  return (session.user as { role?: string } | undefined)?.role;
}

async function visible(id: string, userId: string, role?: string) {
  const rows = await db.select().from(consultations).where(eq(consultations.id, id));
  const c = rows[0];
  if (!c) return null;
  if (c.userId === userId || role === "manager" || (role === "beautician_consultant" && c.staffId === userId)) return c;
  return null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const c = await visible(params.id, session.user.id, staffOf(session));
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pays = await db.select().from(payments).where(eq(payments.consultationId, c.id));
  const credits = await db.select().from(consultationCredits).where(eq(consultationCredits.consultationId, c.id));
  const staff = c.staffId ? (await db.select().from(user).where(eq(user.id, c.staffId)))[0] : null;
  return NextResponse.json({ consultation: c, payments: pays, credit: credits[0] ?? null, staffName: staff?.name ?? null });
}

// PATCH: staff/manager records outcome (completes + issues credit), or client cancels.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const c = await visible(params.id, session.user.id, staffOf(session));
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.action === "complete") {
      const role = staffOf(session);
      const allowed =
        role === "manager" || (role === "beautician_consultant" && (c.staffId === session.user.id || !c.staffId));
      if (!allowed) return NextResponse.json({ error: "Staff only" }, { status: 403 });
      const done = await completeConsultation(c.id, {
        recommendations: body.recommendations ?? "",
        openQuestions: body.openQuestions ?? "",
        nextSteps: body.nextSteps ?? ""
      });
      return NextResponse.json({ consultation: done });
    }
    if (body.action === "cancel") {
      if (c.userId !== session.user.id && staffOf(session) !== "manager") {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      }
      await db.update(consultations).set({ status: "cancelled", updatedAt: new Date() }).where(eq(consultations.id, c.id));
      await db
        .update(consultationCredits)
        .set({ status: "void" })
        .where(eq(consultationCredits.consultationId, c.id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
