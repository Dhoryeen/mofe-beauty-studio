import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, payments } from "@/db/schema";
import { applyPaymentSuccess } from "@/lib/payments/reconcile";
import { verifyPayment } from "@/lib/payments";

// GET /api/payments/verify?reference=… — reconciles then returns booking state.
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });
  const rows = await db.select().from(payments).where(eq(payments.reference, reference));
  const payment = rows[0];
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });

  if (payment.status === "pending") {
    const v = await verifyPayment(reference);
    if (v.status === "success") await applyPaymentSuccess(payment.id);
    else await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, payment.id));
  }
  const b = (await db.select().from(bookings).where(eq(bookings.id, payment.bookingId)))[0];
  return NextResponse.json({
    bookingId: payment.bookingId,
    status: b?.status,
    paymentStatus: b?.paymentStatus,
    paidNaira: b?.paidNaira,
    totalNaira: b?.totalNaira
  });
}
