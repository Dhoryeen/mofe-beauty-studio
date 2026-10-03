import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  bookingStaff,
  bookings,
  messages,
  payments,
  prepTasks,
  progressUpdates,
  quotes,
  refunds,
  rescheduleRequests,
  reviews,
  services,
  user
} from "@/db/schema";
import { QuoteTable } from "@/components/design-system/QuoteTable";
import { PaymentStatus } from "@/components/design-system/PaymentStatus";
import { BookingActions } from "@/components/BookingActions";
import { CancelPanel, CompletePanel, FinalLookPanel, MessagesThread, PrepPanel, ProgressView, ReviewPanel } from "@/components/Execution";
import { holdExpired } from "@/lib/requests";
import { bookingProgress } from "@/lib/progress";
import { resolveUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const rows = await db.select().from(bookings).where(eq(bookings.id, params.id));
  const b = rows[0];
  const role = (session.user as { role?: string } | undefined)?.role;
  const links = b ? await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id)) : [];
  const assigned = links.some((l) => l.staffId === session.user.id);
  if (!b || (b.userId !== session.user.id && role !== "manager" && !assigned)) redirect("/bookings");
  const isOwner = b.userId === session.user.id;
  const isStudio = role === "manager" || assigned;

  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const staff = await Promise.all(
    links.map(async (l) => {
      const u = (await db.select().from(user).where(eq(user.id, l.staffId)))[0];
      return { name: u?.name ?? "Specialist", kind: l.kind };
    })
  );
  const pays = await db.select().from(payments).where(eq(payments.bookingId, b.id));

  const owed = b.totalNaira - b.creditNaira - b.paidNaira;
  const canPay = owed > 0 && ["pending_payment", "confirmed"].includes(b.status);
  const expired = holdExpired(b);
  const linkedQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.bookingId, b.id))
    .orderBy(desc(quotes.version));

  const progress = await bookingProgress(b.id);
  const msgRows = await db.select().from(messages).where(eq(messages.bookingId, b.id)).orderBy(desc(messages.createdAt));
  const thread = await Promise.all(
    [...msgRows].reverse().map(async (m) => {
      const a = (await db.select().from(user).where(eq(user.id, m.authorId)))[0];
      return {
        id: m.id,
        author: m.authorId === session.user.id ? "you" : (a?.name ?? "Studio"),
        mine: m.authorId === session.user.id,
        body: m.body,
        imageUrl: m.imageUrl,
        displayUrl: await resolveUrl(m.imageUrl),
        at: new Date(m.createdAt).toLocaleString()
      };
    })
  );
  const tasks = await db.select().from(prepTasks).where(eq(prepTasks.bookingId, b.id));
  const updateRows = await db.select().from(progressUpdates).where(eq(progressUpdates.bookingId, b.id)).orderBy(desc(progressUpdates.createdAt));
  const updates = await Promise.all(
    [...updateRows].reverse().map(async (u) => {
      const a = (await db.select().from(user).where(eq(user.id, u.authorId)))[0];
      return { id: u.id, author: a?.name ?? "Studio", body: u.body, kind: u.kind, displayUrl: await resolveUrl(u.imageUrl), at: new Date(u.createdAt).toLocaleString() };
    })
  );
  const pendingReschedules = await db.select().from(rescheduleRequests).where(eq(rescheduleRequests.bookingId, b.id));
  const refundRows = await db.select().from(refunds).where(eq(refunds.bookingId, b.id));
  const reviewRows = await db.select().from(reviews).where(eq(reviews.bookingId, b.id));
  const review = reviewRows[0] ? { rating: reviewRows[0].rating, body: reviewRows[0].body, publishConsent: reviewRows[0].publishConsent } : null;

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{svc?.name ?? "Booking"}</h1>
        <PaymentStatus status={b.paymentStatus} />
      </div>
      <div className="rounded-lg bg-card p-4 text-sm shadow-card">
        <p><strong>{new Date(b.slotStart).toLocaleString()}</strong> — {staff.map((s) => s.name).join(" + ")}</p>
        <p className="text-muted">Status: {b.status}</p>
        {b.location && <p className="text-muted">Location: {b.location}</p>}
        {b.status === "request" && (
          <p className="text-muted">
            Request received — this date is not secured.{" "}
            {b.holdUntil ? (expired ? "The temporary hold has expired; the studio must review it before payment." : `Temporary hold until ${new Date(b.holdUntil).toLocaleString()}.`) : ""}
          </p>
        )}
        {b.status === "pending_payment" && (
          <p className="text-danger">Not confirmed yet — no confirmed booking exists until a payment succeeds.</p>
        )}
        {b.status === "completed" && b.aftercare && (
          <p className="mt-2"><strong>Aftercare:</strong> {b.aftercare}</p>
        )}
        {b.status === "completed" && owed > 0 && (
          <p className="text-danger">Completed with ₦{owed.toLocaleString("en-NG")} still owed — please settle.</p>
        )}
      </div>

      {progress && <ProgressView steps={progress.steps} next={progress.next} />}

      <QuoteTable
        lines={[
          { label: "Service total", amount: naira(b.totalNaira) },
          ...(b.creditNaira > 0 ? [{ label: "Consultation credit", amount: `−${naira(b.creditNaira)}` }] : []),
          { label: "Paid so far", amount: naira(b.paidNaira) },
          { label: "Balance due on appointment day", amount: naira(owed) }
        ]}
        total={naira(b.totalNaira)}
      />
      <div className="grid gap-1 text-sm">
        <h2 className="font-semibold">Payments</h2>
        {pays.length === 0 && <p className="text-muted">No payments yet.</p>}
        {pays.map((p) => (
          <p key={p.id} className="text-muted">
            {p.kind} · {naira(p.amountNaira)} · {p.provider} · {p.status} · <span className="font-mono text-xs">{p.reference}</span>
          </p>
        ))}
      </div>
      {linkedQuotes.length > 0 && (
        <div className="grid gap-1 text-sm">
          <h2 className="font-semibold">Studio quotes for this request</h2>
          {linkedQuotes.map((q) => (
            <p key={q.id}>
              <a href={`/quotes/${q.id}`} className="underline">v{q.version}</a> · {q.status} · {naira(q.totalNaira)}
            </p>
          ))}
        </div>
      )}

      {isOwner && ["confirmed", "pending_payment"].includes(b.status) && <BookingActions id={b.id} canPay={canPay} amountOwed={owed} />}
      {pendingReschedules.filter((r) => r.status === "pending").length > 0 && (
        <p className="text-sm text-muted">A reschedule request is with the studio — your original slot stays confirmed meanwhile.</p>
      )}

      <MessagesThread bookingId={b.id} initial={thread} />
      {(["confirmed", "completed"].includes(b.status)) && (
        <PrepPanel
          bookingId={b.id}
          tasks={tasks.map((t) => ({ id: t.id, title: t.title, owner: t.owner, status: t.status, dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null }))}
          updates={updates}
          isStudio={isStudio}
        />
      )}

      {isOwner && ["confirmed", "pending_payment"].includes(b.status) && <CancelPanel bookingId={b.id} />}
      {refundRows.length > 0 && (
        <div className="grid gap-1 text-sm">
          <h2 className="font-semibold">Refunds</h2>
          {refundRows.map((r) => (
            <p key={r.id} className="text-muted">{naira(r.amountNaira)} · {r.status}{r.decisionNote ? ` · ${r.decisionNote}` : ""}</p>
          ))}
        </div>
      )}

      {isStudio && b.status === "confirmed" && <CompletePanel bookingId={b.id} />}
      {isOwner && b.status === "completed" && <ReviewPanel bookingId={b.id} existing={review} />}
      {isOwner && b.status === "completed" && <FinalLookPanel bookingId={b.id} serviceId={b.serviceId} />}

      <p><a href="/bookings" className="text-sm underline">← My bookings</a></p>
    </div>
  );
}
