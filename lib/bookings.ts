import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { bookingStaff, bookings, consultationCredits, looks, payments, services } from "../db/schema";
import { staffForService, staffFree } from "./slots";
import { bookingPayable } from "./requests";
import { applyPaymentSuccess, markPaymentFailed } from "./payments/reconcile";
import { initializePayment, providerName } from "./payments";
import { findCredit } from "./consultations";

export async function createBooking(opts: {
  userId: string;
  email: string;
  serviceId: string;
  lookId?: string;
  staffIds: string[];
  slotStart: string;
  payMode: "deposit" | "full";
  readinessDeadline?: string;
  preferredTime?: string;
  simulate?: string;
}) {
  const svcRows = await db.select().from(services).where(eq(services.id, opts.serviceId));
  const svc = svcRows[0];
  if (!svc || !svc.active) throw Object.assign(new Error("Service unavailable"), { status: 400 });
  if (svc.consultRequired) {
    throw Object.assign(new Error("This service needs studio confirmation first (bridal/complex flow)"), { status: 400 });
  }
  if (opts.lookId) {
    const lRows = await db.select({ id: looks.id }).from(looks).where(eq(looks.id, opts.lookId));
    if (lRows.length === 0) throw Object.assign(new Error("Look not found"), { status: 400 });
  }

  const eligible = await staffForService(svc.category);
  const eligibleIds = new Set(eligible.map((s) => s.id));
  const needTwo = svc.category === "combined";
  if (opts.staffIds.length === 0 || (needTwo && opts.staffIds.length < 2)) {
    throw Object.assign(new Error("Choose your specialist(s)"), { status: 400 });
  }
  for (const id of opts.staffIds) {
    if (!eligibleIds.has(id)) throw Object.assign(new Error("Specialist unavailable for this service"), { status: 400 });
  }
  if (needTwo) {
    const crafts = opts.staffIds.map((id) => eligible.find((s) => s.id === id)?.craft);
    const covers = (want: string) => crafts.some((c) => c === want || c === "both");
    if (!covers("makeup") || !covers("hair")) {
      throw Object.assign(new Error("Combined bookings need a makeup and a hair specialist"), { status: 400 });
    }
  }

  const start = new Date(opts.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("Pick a future slot"), { status: 400 });
  }
  const end = new Date(start.getTime() + svc.durationMin * 60000);
  for (const id of opts.staffIds) {
    if (!(await staffFree(id, start, end))) {
      throw Object.assign(new Error("That slot was just taken — pick another"), { status: 409 });
    }
  }

  const total = svc.priceNaira;
  const deposit = Math.round(total * 0.3);

  // Consultation credit applies first, capped at the service total (PRD §5.3).
  const found = await findCredit(opts.userId, svc.id, opts.lookId);
  const credit = found ? Math.min(found.amountNaira, total) : 0;

  const amount = opts.payMode === "deposit" ? Math.max(deposit - credit, 0) : total - credit;

  const bookingId = randomUUID();
  const paymentId = randomUUID();
  const now = new Date();

  const init =
    amount > 0
      ? await initializePayment({ email: opts.email, amountNaira: amount, simulate: opts.simulate })
      : { reference: `mock_${randomUUID().replace(/-/g, "")}`, authorizationUrl: null as string | null, immediate: "success" as const };

  await db.transaction(async (tx) => {
    await tx.insert(bookings).values({
      id: bookingId,
      userId: opts.userId,
      serviceId: svc.id,
      lookId: opts.lookId ?? null,
      status: "pending_payment",
      slotStart: start,
      slotEnd: end,
      readinessDeadline: opts.readinessDeadline ? new Date(opts.readinessDeadline) : null,
      preferredTime: opts.preferredTime ?? null,
      totalNaira: total,
      depositNaira: deposit,
      paidNaira: 0,
      creditNaira: credit,
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now
    });
    for (const id of opts.staffIds) {
      await tx.insert(bookingStaff).values({
        bookingId,
        staffId: id,
        kind: needTwo ? (opts.staffIds[0] === id ? "makeup" : "hair") : "primary"
      });
    }
    await tx.insert(payments).values({
      id: paymentId,
      bookingId,
      consultationId: null,
      trialId: null,
      provider: providerName(),
      reference: init.reference,
      amountNaira: amount,
      kind: opts.payMode === "deposit" ? "deposit" : "full",
      status: "pending",
      raw: null,
      createdAt: now,
      updatedAt: now
    });
    if (found) {
      await tx
        .update(consultationCredits)
        .set({ status: "applied", appliedBookingId: bookingId })
        .where(eq(consultationCredits.id, found.id));
    }
  });

  // Mock settles instantly; Paystack stays pending until callback/webhook.
  if (init.immediate === "success") await applyPaymentSuccess(paymentId);
  else if (init.immediate === "failed") await markPaymentFailed(paymentId);

  return { bookingId, reference: init.reference, authorizationUrl: init.authorizationUrl };
}

export async function payTowards(opts: {
  bookingId: string;
  userId: string;
  email: string;
  kind: "due" | "balance";
  simulate?: string;
}) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, opts.bookingId));
  const booking = rows[0];
  if (!booking || booking.userId !== opts.userId) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  const remaining = booking.totalNaira - booking.creditNaira - booking.paidNaira;
  if (remaining <= 0) throw Object.assign(new Error("Nothing owed"), { status: 400 });
  const gate = await bookingPayable(booking.id);
  if (!gate.ok) throw Object.assign(new Error(gate.error), { status: 400 });
  const depositCashOwed = Math.max(booking.depositNaira - booking.creditNaira - booking.paidNaira, 0);
  const amount = opts.kind === "due" ? depositCashOwed > 0 ? depositCashOwed : remaining : remaining;

  const paymentId = randomUUID();
  const now = new Date();
  const init = await initializePayment({ email: opts.email, amountNaira: amount, simulate: opts.simulate });
  await db.insert(payments).values({
    id: paymentId,
    bookingId: booking.id,
    provider: providerName(),
    reference: init.reference,
    amountNaira: amount,
    kind: opts.kind === "due" ? "deposit" : "balance",
    status: "pending",
    raw: null,
    createdAt: now,
    updatedAt: now
  });
  if (init.immediate === "success") await applyPaymentSuccess(paymentId);
  else if (init.immediate === "failed") await markPaymentFailed(paymentId);
  return { reference: init.reference, authorizationUrl: init.authorizationUrl };
}

export async function reschedule(opts: { bookingId: string; userId: string; slotStart: string }) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, opts.bookingId));
  const booking = rows[0];
  if (!booking || booking.userId !== opts.userId) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  if (!["confirmed", "pending_payment"].includes(booking.status)) {
    throw Object.assign(new Error("This booking can no longer be rescheduled"), { status: 400 });
  }
  const svcRows = await db.select().from(services).where(eq(services.id, booking.serviceId));
  const start = new Date(opts.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("Pick a future slot"), { status: 400 });
  }
  const end = new Date(start.getTime() + (svcRows[0]?.durationMin ?? 60) * 60000);
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, booking.id));
  for (const l of links) {
    if (!(await staffFree(l.staffId, start, end, booking.id))) {
      throw Object.assign(new Error("That slot is taken — pick another"), { status: 409 });
    }
  }
  await db
    .update(bookings)
    .set({ slotStart: start, slotEnd: end, updatedAt: new Date() })
    .where(eq(bookings.id, booking.id));
  return { ok: true };
}
