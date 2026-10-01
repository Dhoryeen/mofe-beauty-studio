import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { consultationCredits, consultations, payments, services, settings } from "../db/schema";
import { staffFree } from "./slots";
import { applyPaymentSuccess, markPaymentFailed } from "./payments/reconcile";
import { initializePayment, providerName } from "./payments";

async function setting(key: string, fallback: string) {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value ?? fallback;
}

export async function consultationFee() {
  return Number(await setting("consultation_fee", "10000"));
}
export async function consultationDurationMin() {
  return Number(await setting("consultation_duration_min", "30"));
}
export async function trialFee() {
  return Number(await setting("trial_fee", "15000"));
}

export async function bookConsultation(opts: {
  userId: string;
  email: string;
  serviceId: string;
  lookId?: string;
  staffId?: string;
  mode: "in_person" | "video";
  slotStart: string;
  simulate?: string;
}) {
  const svc = (await db.select().from(services).where(eq(services.id, opts.serviceId)))[0];
  if (!svc || !svc.active) throw Object.assign(new Error("Service unavailable"), { status: 400 });
  const dur = await consultationDurationMin();
  const start = new Date(opts.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("Pick a future slot"), { status: 400 });
  }
  const end = new Date(start.getTime() + dur * 60000);
  if (opts.staffId && !(await staffFree(opts.staffId, start, end))) {
    throw Object.assign(new Error("That slot was just taken — pick another"), { status: 409 });
  }

  const fee = await consultationFee();
  const consultId = randomUUID();
  const paymentId = randomUUID();
  const now = new Date();
  const init = await initializePayment({ email: opts.email, amountNaira: fee, simulate: opts.simulate });

  await db.transaction(async (tx) => {
    await tx.insert(consultations).values({
      id: consultId,
      userId: opts.userId,
      lookId: opts.lookId ?? null,
      serviceId: svc.id,
      staffId: opts.staffId ?? null,
      mode: opts.mode,
      slotStart: start,
      slotEnd: end,
      feeNaira: fee,
      status: "pending_payment",
      createdAt: now,
      updatedAt: now
    });
    await tx.insert(payments).values({
      id: paymentId,
      bookingId: null,
      consultationId: consultId,
      trialId: null,
      provider: providerName(),
      reference: init.reference,
      amountNaira: fee,
      kind: "consultation",
      status: "pending",
      raw: null,
      createdAt: now,
      updatedAt: now
    });
  });

  if (init.immediate === "success") {
    await applyConsultationPayment(paymentId);
  } else if (init.immediate === "failed") {
    await markPaymentFailed(paymentId);
  }
  return { consultationId: consultId, reference: init.reference, authorizationUrl: init.authorizationUrl };
}

export async function applyConsultationPayment(paymentId: string) {
  const rows = await db.select().from(payments).where(eq(payments.id, paymentId));
  const payment = rows[0];
  if (!payment || payment.status === "success" || !payment.consultationId) return payment ?? null;
  await applyPaymentSuccess(paymentId);
  const now = new Date();
  await db
    .update(consultations)
    .set({ status: "booked", updatedAt: now })
    .where(eq(consultations.id, payment.consultationId));
  return payment;
}

// Records the beautician's outcome and completes the consultation, issuing the
// single-use credit exactly once (unique consultationId).
export async function completeConsultation(
  consultationId: string,
  outcome: { recommendations: string; openQuestions: string; nextSteps: string }
) {
  const rows = await db.select().from(consultations).where(eq(consultations.id, consultationId));
  const c = rows[0];
  if (!c) throw Object.assign(new Error("Not found"), { status: 404 });
  if (c.status === "completed") return c;
  if (c.status !== "booked") throw Object.assign(new Error("Consultation is not booked"), { status: 400 });
  const now = new Date();
  await db
    .update(consultations)
    .set({ ...outcome, status: "completed", updatedAt: now })
    .where(eq(consultations.id, c.id));
  await db
    .insert(consultationCredits)
    .values({
      id: randomUUID(),
      consultationId: c.id,
      userId: c.userId,
      serviceId: c.serviceId,
      lookId: c.lookId,
      amountNaira: c.feeNaira,
      status: "issued"
    })
    .onConflictDoNothing({ target: consultationCredits.consultationId });
  return { ...c, status: "completed" };
}

// Finds the user's usable credit for a booking: same look preferred, else same service.
export async function findCredit(userId: string, serviceId: string, lookId?: string) {
  const rows = await db
    .select()
    .from(consultationCredits)
    .where(and(eq(consultationCredits.userId, userId), eq(consultationCredits.status, "issued")));
  return (
    rows.find((r) => lookId && r.lookId === lookId) ??
    rows.find((r) => r.serviceId === serviceId) ??
    null
  );
}
