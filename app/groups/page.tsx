import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { myGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const rows = await myGroups(session.user.id);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Groups</h1>
          <p className="text-sm text-muted">Coordinate bridal parties and events through one organiser.</p>
        </div>
        <a href="/groups/new" className="rounded-md bg-ink px-4 py-2 text-sm text-cream">New group</a>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No groups yet.</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((g) => (
            <a key={g.id} href={`/groups/${g.id}`} className="flex items-center justify-between rounded-lg bg-card p-4 shadow-card">
              <div>
                <p className="font-semibold">{g.name}</p>
                <p className="text-xs text-muted">{g.organiserId === session.user.id ? "organiser" : "member"}{g.location ? ` · ${g.location}` : ""}</p>
              </div>
              <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{g.status}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
