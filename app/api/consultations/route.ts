import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consultations } from "@/db/schema";
import { bookConsultation } from "@/lib/consultations";

function err(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const rows =
    role === "manager"
      ? await db.select().from(consultations).orderBy(desc(consultations.createdAt))
      : await db.select().from(consultations).where(eq(consultations.userId, session.user.id)).orderBy(desc(consultations.createdAt));
  return NextResponse.json({ consultations: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    if (!["in_person", "video"].includes(body?.mode)) {
      return NextResponse.json({ error: "mode must be in_person or video" }, { status: 400 });
    }
    const result = await bookConsultation({
      userId: session.user.id,
      email: session.user.email,
      serviceId: body.serviceId,
      lookId: body.lookId ?? undefined,
      staffId: body.staffId && body.staffId !== "match" ? body.staffId : undefined,
      mode: body.mode,
      slotStart: body.slotStart,
      simulate: process.env.PAYSTACK_SECRET_KEY ? undefined : body.simulate
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return err(e);
  }
}
