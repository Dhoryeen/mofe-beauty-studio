import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { dashboard } from "@/lib/reports";

export const dynamic = "force-dynamic";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function Queue({ title, count, href, children }: { title: string; count: number; href: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <a href={href} className="rounded-full bg-ink px-3 py-1 text-xs text-cream">{count}</a>
      </div>
      {children}
    </div>
  );
}

export default async function AdminDashboard() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") redirect("/sign-in");
  const d = await dashboard();

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold">Studio dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Queue title="Today's appointments" count={d.today.length} href="/admin/requests">
          {d.today.slice(0, 8).map((b) => (
            <p key={b.id} className="text-sm">
              <a href={`/bookings/${b.id}`} className="underline">{new Date(b.slotStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</a> · {b.status} · {b.paymentStatus}
            </p>
          ))}
          {d.today.length === 0 && <p className="text-sm text-muted">Nothing today.</p>}
        </Queue>
        <Queue title="Booking requests" count={d.requests} href="/admin/requests">
          <p className="text-sm text-muted">{d.overdueHolds.length} with expired holds — review before any payment.</p>
        </Queue>
        <Queue title="Outstanding payments" count={d.unpaid.length} href="/admin/changes">
          {d.unpaid.slice(0, 5).map((b) => (
            <p key={b.id} className="text-sm">
              <a href={`/bookings/${b.id}`} className="underline">₦{(b.totalNaira - b.creditNaira - b.paidNaira).toLocaleString("en-NG")} owed</a> · {b.paymentStatus}
            </p>
          ))}
          {d.unpaid.length === 0 && <p className="text-sm text-muted">All settled.</p>}
        </Queue>
        <Queue title="Unanswered messages" count={d.unanswered.length} href="/work">
          {d.unanswered.slice(0, 5).map((u) => (
            <p key={u.bookingId} className="text-sm">
              <a href={`/bookings/${u.bookingId}`} className="underline">Reply needed</a> · client wrote {u.at}
            </p>
          ))}
          {d.unanswered.length === 0 && <p className="text-sm text-muted">Inbox clear.</p>}
        </Queue>
        <Queue title="Reschedules + refunds" count={d.pendingReschedules + d.pendingRefunds} href="/admin/changes">
          <p className="text-sm text-muted">{d.pendingReschedules} reschedule asks · {d.pendingRefunds} refund asks</p>
        </Queue>
        <Queue title="Prep, quotes, waitlist" count={d.overduePrep + d.draftQuotes + d.openWaitlist} href="/work">
          <p className="text-sm text-muted">{d.overduePrep} overdue tasks · {d.draftQuotes} draft quotes · {d.openWaitlist} waiting</p>
        </Queue>
      </div>

      <div className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Staff schedules</h2>
        {d.schedules.map((s) => (
          <div key={s.id} className="text-sm">
            <p className="font-medium">{s.name}</p>
            {s.upcoming.length === 0 && <p className="text-muted">Nothing upcoming.</p>}
            {s.upcoming.map((b) => (
              <p key={b.id} className="text-muted">
                <a href={`/bookings/${b.id}`} className="underline">{new Date(b.slotStart).toLocaleString()}</a>
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
        <h2 className="font-semibold">Reports</h2>
        <p>Collected: <strong>{naira(d.reports.collected)}</strong> · Refunded: <strong>{naira(d.reports.refunded)}</strong></p>
        <p>Outstanding balances: <strong>{naira(d.reports.outstanding)}</strong> (service value delivered/ordered: {naira(d.reports.serviceValue)})</p>
        <p>Completed appointments: <strong>{d.reports.completions}</strong> · Clients: <strong>{d.reports.clients}</strong> · Repeat bookers: <strong>{d.reports.repeats}</strong> · Published reviews: <strong>{d.reports.publishedReviews}</strong></p>
        <p className="text-muted">Popular: {d.reports.popular.map((p) => `${p.name} (${p.bookings})`).join(" · ") || "—"}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a href="/admin/quotes" className="underline">Quotes</a>
        <a href="/admin/gallery" className="underline">Gallery</a>
        <a href="/admin/settings" className="underline">Settings</a>
        <a href="/admin/waitlist" className="underline">Waitlist</a>
      </div>
    </div>
  );
}
