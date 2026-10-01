import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { waitlist } from "@/db/schema";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json();
  if (!["open", "notified", "closed"].includes(body?.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await db.update(waitlist).set({ status: body.status }).where(eq(waitlist.id, params.id));
  return NextResponse.json({ ok: true });
}
