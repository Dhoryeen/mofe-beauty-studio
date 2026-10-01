import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, consultations, payments, trials } from "@/db/schema";
import { applyPaymentSuccess } from "@/lib/payments/reconcile";
import { applyConsultationPayment } from "@/lib/consultations";
import { verifyPayment } from "@/lib/payments";

// GET /api/payments/verify?reference=… — reconciles then returns where to go next.
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });
  const rows = await db.select().from(payments).where(eq(payments.reference, reference));
  const payment = rows[0];
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });

  if (payment.status === "pending") {
    const v = await verifyPayment(reference);
    if (v.status === "success") {
      if (payment.bookingId) await applyPaymentSuccess(payment.id);
      else if (payment.consultationId) await applyConsultationPayment(payment.id);
      else if (payment.trialId) {
        await db.update(payments).set({ status: "success", updatedAt: new Date() }).where(eq(payments.id, payment.id));
        await db.update(trials).set({ status: "booked", updatedAt: new Date() }).where(eq(trials.id, payment.trialId));
      }
    } else {
      await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, payment.id));
    }
  }
  const out: Record<string, unknown> = { kind: payment.kind, reference };
  if (payment.bookingId) {
    const b = (await db.select().from(bookings).where(eq(bookings.id, payment.bookingId)))[0];
    Object.assign(out, { bookingId: payment.bookingId, status: b?.status, paymentStatus: b?.paymentStatus, paidNaira: b?.paidNaira, totalNaira: b?.totalNaira });
  } else if (payment.consultationId) {
    const c = (await db.select().from(consultations).where(eq(consultations.id, payment.consultationId)))[0];
    Object.assign(out, { consultationId: payment.consultationId, status: c?.status });
  } else if (payment.trialId) {
    const t = (await db.select().from(trials).where(eq(trials.id, payment.trialId)))[0];
    Object.assign(out, { trialId: payment.trialId, quoteId: t?.quoteId, status: t?.status });
  }
  return NextResponse.json(out);
}
