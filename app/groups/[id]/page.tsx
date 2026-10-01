import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { groupMembers, groups } from "@/db/schema";
import { membership, readiness } from "@/lib/groups";
import { GroupTracker } from "@/components/GroupViews";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const role = (session.user as { role?: string } | undefined)?.role;
  const g = (await db.select().from(groups).where(eq(groups.id, params.id)))[0];
  if (!g) redirect("/groups");
  const mem = role === "manager" ? { role: "manager" } : await membership(g.id, session.user.id);
  if (!mem) redirect("/groups");
  const viewerRole = role === "manager" ? "manager" : (mem as { role: string }).role;

  const full = await readiness(g.id);
  const rows = viewerRole === "member" ? full.filter((r) => r.userId === session.user.id).map((r) => ({ ...r, email: "you" })) : full;
  const myRow = full.find((r) => r.userId === session.user.id);
  const memberCount = (await db.select().from(groupMembers).where(eq(groupMembers.groupId, g.id))).length;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{g.name}</h1>
          <p className="text-sm text-muted">
            {g.eventDate ? new Date(g.eventDate).toLocaleString() : "date TBC"}
            {g.location ? ` · ${g.location}` : ""}
            {g.readinessDeadline ? ` · ready by ${new Date(g.readinessDeadline).toLocaleString()}` : ""}
            {viewerRole === "member" ? " · viewing as member" : ""}
          </p>
        </div>
        <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{g.status}</span>
      </div>

      {viewerRole === "member" && !myRow?.bookingId && (
        <div className="rounded-lg bg-card p-4 text-sm shadow-card">
          <p>You haven’t chosen your service yet.</p>
          <p><a href={`/requests/new?groupId=${g.id}`} className="underline">Request your service for this group →</a></p>
        </div>
      )}

      <GroupTracker
        groupId={g.id}
        viewerRole={viewerRole}
        payMode={g.payMode}
        sharedNaira={g.sharedNaira}
        sharedNote={g.sharedNote}
        status={g.status}
        readiness={rows}
        memberCount={memberCount}
      />
      <p><a href="/groups" className="text-sm underline">← Groups</a></p>
    </div>
  );
}
