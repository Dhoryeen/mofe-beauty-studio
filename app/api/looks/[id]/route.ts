import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { lookImages, looks } from "@/db/schema";

async function owned(id: string, userId: string) {
  const rows = await db
    .select({ id: looks.id })
    .from(looks)
    .where(and(eq(looks.id, id), eq(looks.userId, userId)));
  return rows.length > 0;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await owned(params.id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rows = await db.select().from(looks).where(eq(looks.id, params.id));
  const images = await db.select().from(lookImages).where(eq(lookImages.lookId, params.id));
  return NextResponse.json({ look: rows[0], images });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await owned(params.id, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  if (body.status !== undefined && !["draft", "archived"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of [
    "name",
    "occasion",
    "makeupPreferences",
    "hairstyle",
    "hairLengthTexture",
    "finish",
    "avoidDetails",
    "sensitivities",
    "productPreferences",
    "status"
  ]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  await db.update(looks).set(patch).where(eq(looks.id, params.id));
  return NextResponse.json({ ok: true });
}
