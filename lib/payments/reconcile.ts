import { eq } from "drizzle-orm";
import { db } from "../db";
import { bookings, bookingStaff, payments, services, user } from "../../db/schema";
import { bookingConfirmationEmail, sendEmail } from "../email";

// Idempotent: applying an already-successful payment is a no-op.
export async function applyPaymentSuccess(paymentId: string) {
  const rows = await db.select().from(payments).where(eq(payments.id, paymentId));
  const payment = rows[0];
  if (!payment || payment.status === "success") return payment ?? null;
  if (!payment.bookingId) return payment;

  const now = new Date();
  await db.update(payments).set({ status: "success", updatedAt: now }).where(eq(payments.id, paymentId));

  const bRows = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId));
  const booking = bRows[0];
  if (!booking) return payment;
  const paid = booking.paidNaira + payment.amountNaira;
  await db
    .update(bookings)
    .set({
      paidNaira: paid,
      paymentStatus: paid >= booking.totalNaira ? "paid" : "partial",
      // A deposit (or full) success confirms a standard booking.
      status: booking.status === "pending_payment" ? "confirmed" : booking.status,
      updatedAt: now
    })
    .where(eq(bookings.id, booking.id));

  // Receipt email — informational only, never blocks.
  const u = (await db.select().from(user).where(eq(user.id, booking.userId)))[0];
  const svc = (await db.select().from(services).where(eq(services.id, booking.serviceId)))[0];
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, booking.id));
  const names = await Promise.all(
    links.map(async (l) => (await db.select().from(user).where(eq(user.id, l.staffId)))[0]?.name ?? "Specialist")
  );
  if (u?.email) {
    const mail = bookingConfirmationEmail({
      name: u.name,
      service: svc?.name ?? "Service",
      slot: new Date(booking.slotStart).toLocaleString(),
      staff: names.join(" + "),
      paid,
      total: booking.totalNaira,
      bookingId: booking.id
    });
    await sendEmail({ to: u.email, subject: mail.subject, html: mail.html });
  }
  return payment;
}

export async function markPaymentFailed(paymentId: string) {
  await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, paymentId));
}
