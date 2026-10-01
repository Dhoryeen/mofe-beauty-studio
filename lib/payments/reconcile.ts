import { eq } from "drizzle-orm";
import { db } from "../db";
import { bookings, payments } from "../../db/schema";

// Idempotent: applying an already-successful payment is a no-op.
export async function applyPaymentSuccess(paymentId: string) {
  const rows = await db.select().from(payments).where(eq(payments.id, paymentId));
  const payment = rows[0];
  if (!payment || payment.status === "success") return payment ?? null;

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
  return payment;
}

export async function markPaymentFailed(paymentId: string) {
  await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, paymentId));
}
