import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, services } from "@/db/schema";
import { RequestActions } from "@/components/RequestFlow";
import { holdExpired } from "@/lib/requests";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") redirect("/sign-in");

  const rows = await db.select().from(bookings).where(eq(bookings.status, "request")).orderBy(desc(bookings.createdAt));

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Booking requests</h1>
      <p className="text-sm text-muted">Bridal, complex, group and off-site asks awaiting studio review. Accepting sends the client a quote for approval.</p>
      {rows.length === 0 && <p className="text-sm text-muted">No pending requests.</p>}
      {await Promise.all(
        rows.map(async (b) => {
          const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
          const expired = holdExpired(b);
          return (
            <div key={b.id} className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold">{svc?.name ?? "Service"}{b.location ? ` · off-site: ${b.location}` : ""}{b.groupId ? " · group" : ""}</p>
                <span className="rounded-full bg-black/10 px-3 py-1 text-xs">
                  {expired ? "hold expired" : b.holdUntil ? `hold until ${new Date(b.holdUntil).toLocaleString()}` : "request"}
                </span>
              </div>
              <p className="text-xs text-muted">
                Requested {new Date(b.slotStart).toLocaleString()}
                {b.readinessDeadline ? ` · must-be-ready ${new Date(b.readinessDeadline).toLocaleString()}` : ""}
                {b.preferredTime ? ` · prefers ${b.preferredTime}` : ""}
              </p>
              <RequestActions id={b.id} />
            </div>
          );
        })
      )}
    </div>
  );
}
