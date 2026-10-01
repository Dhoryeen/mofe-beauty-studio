import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookingStaff, bookings, payments, services, user } from "@/db/schema";
import { QuoteTable } from "@/components/design-system/QuoteTable";
import { PaymentStatus } from "@/components/design-system/PaymentStatus";
import { MilestoneTracker } from "@/components/design-system/MilestoneTracker";
import { BookingActions } from "@/components/BookingActions";

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
  if (!b || (b.userId !== session.user.id && role !== "manager")) redirect("/bookings");

  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id));
  const staff = await Promise.all(
    links.map(async (l) => {
      const u = (await db.select().from(user).where(eq(user.id, l.staffId)))[0];
      return { name: u?.name ?? "Specialist", kind: l.kind };
    })
  );
  const pays = await db.select().from(payments).where(eq(payments.bookingId, b.id));

  const owed = b.totalNaira - b.paidNaira;
  const canPay = owed > 0 && ["pending_payment", "confirmed"].includes(b.status);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{svc?.name ?? "Booking"}</h1>
        <PaymentStatus status={b.paymentStatus} />
      </div>
      <div className="rounded-lg bg-card p-4 text-sm shadow-card">
        <p><strong>{new Date(b.slotStart).toLocaleString()}</strong> — {staff.map((s) => s.name).join(" + ")}</p>
        <p className="text-muted">Status: {b.status}</p>
        {b.status === "pending_payment" && (
          <p className="text-danger">Not confirmed yet — no confirmed booking exists until a payment succeeds.</p>
        )}
      </div>
      <QuoteTable
        lines={[
          { label: "Service total", amount: naira(b.totalNaira) },
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
      <MilestoneTracker current={b.status === "confirmed" ? 4 : 2} />
      {b.userId === session.user.id && <BookingActions id={b.id} canPay={canPay} amountOwed={owed} />}
      <p><a href="/bookings" className="text-sm underline">← My bookings</a></p>
    </div>
  );
}
