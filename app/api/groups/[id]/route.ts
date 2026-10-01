import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, groupInvites, groupMembers, groups, user } from "@/db/schema";
import { membership, organiserUpdate, readiness, setGroupStatus } from "@/lib/groups";

function err(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
}

async function access(groupId: string, userId: string, role?: string) {
  const g = (await db.select().from(groups).where(eq(groups.id, groupId)))[0];
  if (!g) return null;
  if (role === "manager") return { group: g, role: "manager" as const, member: null };
  const mem = await membership(groupId, userId);
  if (!mem) return null;
  return { group: g, role: mem.role as "organiser" | "member", member: mem };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  const a = await access(params.id, session.user.id, role);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, a.group.id));
  const invites = a.role !== "member" ? await db.select().from(groupInvites).where(eq(groupInvites.groupId, a.group.id)) : [];
  const full = await readiness(a.group.id);
  const me = full.find((r) => r.userId === session.user.id);

  // Privacy: organisers track readiness but never see members' private
  // notes/sensitivities (those live on owner-scoped looks, unexposed here).
  // Members see shared arrangements + their own row only.
  const rows =
    a.role === "member"
      ? full.filter((r) => r.userId === session.user.id).map((r) => ({ ...r, email: "you" }))
      : full;
  const myBookings =
    a.role === "member"
      ? await db.select().from(bookings).where(eq(bookings.userId, session.user.id))
      : [];
  const organiserEmail =
    a.role !== "member"
      ? (await db.select().from(user).where(eq(user.id, a.group.organiserId)))[0]?.email ?? ""
      : "";
  return NextResponse.json({
    group: a.group,
    viewerRole: a.role,
    readiness: rows,
    myBooking: me?.bookingId ?? myBookings.filter((b) => b.groupId === a.group.id).map((b) => b.id)[0] ?? null,
    invites,
    organiserEmail,
    memberCount: members.length
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = (session.user as { role?: string } | undefined)?.role;
  try {
    const body = await req.json();
    const g = (await db.select().from(groups).where(eq(groups.id, params.id)))[0];
    if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (role === "manager") {
      if (body.action === "review") {
        return NextResponse.json(
          await setGroupStatus(g.id, body.status, {
            sharedNaira: body.sharedNaira !== undefined ? Number(body.sharedNaira) : undefined,
            sharedNote: body.sharedNote,
            note: body.note
          })
        );
      }
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    if (g.organiserId !== session.user.id) return NextResponse.json({ error: "Organisers only" }, { status: 403 });
    if (body.action === "update") {
      return NextResponse.json(await organiserUpdate(g.id, session.user.id, body.patch ?? {}));
    }
    if (body.action === "accept-shared") {
      if (g.status !== "quoted") return NextResponse.json({ error: "Shared arrangements are not ready to accept" }, { status: 400 });
      return NextResponse.json(await setGroupStatus(g.id, "awaiting_deposits", {}));
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return err(e);
  }
}
