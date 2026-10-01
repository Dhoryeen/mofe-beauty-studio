import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { groupInvites, groups } from "@/db/schema";
import { inviteMember } from "@/lib/groups";

// POST /api/groups/[id]/invite { email } — organiser only.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await inviteMember(session.user.id, params.id, body.email ?? "");
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const g = (await db.select().from(groups).where(eq(groups.id, params.id)))[0];
  const role = (session.user as { role?: string } | undefined)?.role;
  if (!g || (g.organiserId !== session.user.id && role !== "manager")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rows = await db.select().from(groupInvites).where(eq(groupInvites.groupId, g.id));
  return NextResponse.json({ invites: rows });
}
