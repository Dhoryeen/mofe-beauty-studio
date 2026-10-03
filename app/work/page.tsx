import { and, desc, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  bookingStaff,
  bookings,
  consultations,
  messages,
  prepTasks,
  quotes,
  services,
  user
} from "@/db/schema";
import { AvailabilityEditor } from "@/components/WorkPanels";
import { effectiveStatus } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== "beautician_consultant" && role !== "manager") redirect("/");

  const myLinks = await db.select().from(bookingStaff).where(eq(bookingStaff.staffId, session.user.id));
  const myBookingIds = new Set(myLinks.map((l) => l.bookingId));
  const scope = async () => {
    const all = await db.select().from(bookings).orderBy(desc(bookings.slotStart));
    return role === "manager" ? all : all.filter((b) => myBookingIds.has(b.id));
  };
  const mine = (await scope()).filter((b) => ["confirmed", "pending_payment"].includes(b.status));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = mine.filter((b) => new Date(b.slotEnd) >= today).slice(0, 20);

  // Threads where the client spoke last and staff hasn't replied.
  const needsReply: { bookingId: string; service: string; at: string }[] = [];
  for (const b of mine.slice(0, 30)) {
    const thread = await db.select().from(messages).where(eq(messages.bookingId, b.id)).orderBy(desc(messages.createdAt));
    const last = thread[0];
    if (last && last.authorId === b.userId) {
      const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
      needsReply.push({ bookingId: b.id, service: svc?.name ?? "", at: new Date(last.createdAt).toLocaleString() });
    }
  }

  const openTasks = [];
  for (const b of mine) {
    const tasks = await db.select().from(prepTasks).where(and(eq(prepTasks.bookingId, b.id), eq(prepTasks.status, "open")));
    for (const t of tasks) openTasks.push({ ...t, bookingId: b.id });
  }

  const consultRows = await db.select().from(consultations).orderBy(desc(consultations.createdAt));
  const myConsults = (role === "manager" ? consultRows : consultRows.filter((c) => !c.staffId || c.staffId === session.user.id)).filter((c) => c.status === "booked").slice(0, 10);

  const quoteRows = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  const myQuotes = (role === "manager" ? quoteRows : quoteRows.filter((q) => q.createdBy === session.user.id))
    .filter((q) => ["draft", "awaiting_approval"].includes(effectiveStatus(q)))
    .slice(0, 10);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">My work</h1>
        <p className="text-sm text-muted">Assigned appointments, messages needing replies, preparation and approvals.</p>
      </div>

      {needsReply.length > 0 && (
        <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
          <h2 className="font-semibold">Messages needing a reply ({needsReply.length})</h2>
          {needsReply.map((n) => (
            <p key={n.bookingId} className="text-sm">
              <a href={`/bookings/${n.bookingId}`} className="underline">{n.service}</a> · client wrote {n.at}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Upcoming appointments ({upcoming.length})</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted">Nothing scheduled.</p>}
        {upcoming.map((b) => (
          <p key={b.id} className="text-sm">
            <a href={`/bookings/${b.id}`} className="underline">{new Date(b.slotStart).toLocaleString()}</a> · {b.status} · {b.paymentStatus}
          </p>
        ))}
      </div>

      <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Open preparation ({openTasks.length})</h2>
        {openTasks.slice(0, 15).map((t) => (
          <p key={t.id} className="text-sm">
            <a href={`/bookings/${t.bookingId}`} className="underline">{t.title}</a> · {t.owner === "client" ? "client task" : "studio task"}
            {t.dueAt && new Date(t.dueAt) < new Date() ? " · overdue" : ""}
          </p>
        ))}
        {openTasks.length === 0 && <p className="text-sm text-muted">All clear.</p>}
      </div>

      <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Consultations awaiting outcome ({myConsults.length})</h2>
        {myConsults.map((c) => (
          <p key={c.id} className="text-sm">
            <a href={`/consultations/${c.id}`} className="underline">{c.slotStart ? new Date(c.slotStart).toLocaleString() : "Unscheduled"}</a> · {c.mode}
          </p>
        ))}
        {myConsults.length === 0 && <p className="text-sm text-muted">None.</p>}
      </div>

      <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Quotes in progress ({myQuotes.length})</h2>
        {myQuotes.map((q) => (
          <p key={q.id} className="text-sm">
            <a href={`/quotes/${q.id}`} className="underline">v{q.version}</a> · {effectiveStatus(q)}
          </p>
        ))}
        {myQuotes.length === 0 && <p className="text-sm text-muted">None.</p>}
        <p className="text-xs text-muted">Chargeable extras or price changes go through a quote revision — <a href="/admin/quotes" className="underline">propose one here</a> for manager review.</p>
      </div>

      <AvailabilityEditor staffId={role === "manager" ? undefined : session.user.id} />
      {role === "manager" && (
        <p className="text-sm text-muted">Managers: pick a specialist in <a href="/admin" className="underline">the dashboard</a> to manage their hours.</p>
      )}
    </div>
  );
}
