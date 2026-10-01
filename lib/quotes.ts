import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { payments, quoteApprovals, quotes, services, settings, trials } from "../db/schema";
import { staffFree } from "./slots";
import { applyPaymentSuccess, markPaymentFailed } from "./payments/reconcile";
import { initializePayment, providerName } from "./payments";
import { trialFee } from "./consultations";

export function effectiveStatus(q: { status: string; validUntil: Date | null }) {
  if (q.status === "awaiting_approval" && q.validUntil && new Date(q.validUntil).getTime() < Date.now()) {
    return "expired";
  }
  return q.status;
}

async function quoteValidityDays() {
  const rows = await db.select().from(settings).where(eq(settings.key, "quote_validity_days"));
  return Number(rows[0]?.value ?? "7");
}

export async function createQuote(opts: {
  userId: string;
  serviceId: string;
  lookId?: string;
  bookingId?: string;
  makeup: string;
  hairstyle: string;
  referencePhotos?: string[];
  extras?: string[];
  prepRequirements?: string;
  travelNaira?: number;
  depositNaira?: number;
  note?: string;
  createdBy: string;
  send?: boolean;
}) {
  const svc = (await db.select().from(services).where(eq(services.id, opts.serviceId)))[0];
  if (!svc) throw Object.assign(new Error("Unknown service"), { status: 400 });
  const total = svc.priceNaira + (opts.travelNaira ?? 0);
  const deposit = opts.depositNaira ?? Math.round(total * 0.3);
  const days = await quoteValidityDays();
  const id = randomUUID();
  await db.insert(quotes).values({
    id,
    userId: opts.userId,
    lookId: opts.lookId ?? null,
    serviceId: svc.id,
    bookingId: opts.bookingId ?? null,
    version: 1,
    supersedesId: null,
    status: opts.send ? "awaiting_approval" : "draft",
    makeup: opts.makeup ?? "",
    hairstyle: opts.hairstyle ?? "",
    referencePhotos: opts.referencePhotos ?? [],
    extras: opts.extras ?? [],
    prepRequirements: opts.prepRequirements ?? "",
    serviceNaira: svc.priceNaira,
    travelNaira: opts.travelNaira ?? 0,
    creditNaira: 0,
    depositNaira: deposit,
    totalNaira: total,
    validUntil: opts.send ? new Date(Date.now() + days * 86400000) : null,
    note: opts.note ?? "",
    createdBy: opts.createdBy
  });
  return { id };
}

// Material change => new version; the old one is retained as superseded.
export async function reviseQuote(
  quoteId: string,
  patch: Partial<{
    makeup: string;
    hairstyle: string;
    referencePhotos: string[];
    extras: string[];
    prepRequirements: string;
    travelNaira: number;
    depositNaira: number;
    note: string;
  }>,
  actorId: string,
  send = true
) {
  const rows = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  const q = rows[0];
  if (!q) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!["draft", "awaiting_approval", "approved", "expired", "rejected"].includes(effectiveStatus(q))) {
    throw Object.assign(new Error("This version is closed — start from the latest open version"), { status: 400 });
  }
  const id = randomUUID();
  const days = await quoteValidityDays();
  const travel = patch.travelNaira ?? q.travelNaira;
  const total = q.serviceNaira + travel;
  await db.transaction(async (tx) => {
    await tx.update(quotes).set({ status: "superseded" }).where(eq(quotes.id, q.id));
    await tx.insert(quotes).values({
      ...q,
      id,
      version: q.version + 1,
      supersedesId: q.id,
      status: send ? "awaiting_approval" : "draft",
      makeup: patch.makeup ?? q.makeup,
      hairstyle: patch.hairstyle ?? q.hairstyle,
      referencePhotos: patch.referencePhotos ?? q.referencePhotos,
      extras: patch.extras ?? q.extras,
      prepRequirements: patch.prepRequirements ?? q.prepRequirements,
      travelNaira: travel,
      depositNaira: patch.depositNaira ?? q.depositNaira,
      totalNaira: total,
      validUntil: send ? new Date(Date.now() + days * 86400000) : q.validUntil,
      note: patch.note ?? q.note,
      createdBy: actorId,
      createdAt: new Date()
    });
  });
  return { id };
}

export async function decideQuote(quoteId: string, userId: string, decision: "approved" | "rejected", note?: string) {
  const rows = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  const q = rows[0];
  if (!q || q.userId !== userId) throw Object.assign(new Error("Not found"), { status: 404 });
  if (effectiveStatus(q) !== "awaiting_approval") {
    throw Object.assign(new Error("This quote is not awaiting approval (it may have expired)"), { status: 400 });
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(quotes).set({ status: decision }).where(eq(quotes.id, q.id));
    await tx.insert(quoteApprovals).values({
      id: randomUUID(),
      quoteId: q.id,
      userId,
      decision,
      note: note ?? "",
      createdAt: now
    });
  });
  return { ok: true };
}

export async function bookTrial(opts: {
  userId: string;
  email: string;
  quoteId: string;
  staffId?: string;
  slotStart: string;
  simulate?: string;
}) {
  const qRows = await db.select().from(quotes).where(eq(quotes.id, opts.quoteId));
  const q = qRows[0];
  if (!q || q.userId !== opts.userId) throw Object.assign(new Error("Not found"), { status: 404 });
  const svc = (await db.select().from(services).where(eq(services.id, q.serviceId)))[0];
  const start = new Date(opts.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("Pick a future slot"), { status: 400 });
  }
  const end = new Date(start.getTime() + 60 * 60000); // trials run 60 min
  if (opts.staffId && !(await staffFree(opts.staffId, start, end))) {
    throw Object.assign(new Error("That slot was just taken — pick another"), { status: 409 });
  }
  const fee = await trialFee();
  const trialId = randomUUID();
  const paymentId = randomUUID();
  const now = new Date();
  const init = await initializePayment({ email: opts.email, amountNaira: fee, simulate: opts.simulate });
  await db.transaction(async (tx) => {
    await tx.insert(trials).values({
      id: trialId,
      userId: opts.userId,
      quoteId: q.id,
      serviceId: q.serviceId,
      staffId: opts.staffId ?? null,
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
      consultationId: null,
      trialId,
      provider: providerName(),
      reference: init.reference,
      amountNaira: fee,
      kind: "trial",
      status: "pending",
      raw: null,
      createdAt: now,
      updatedAt: now
    });
  });
  if (init.immediate === "success") {
    await db.update(payments).set({ status: "success", updatedAt: new Date() }).where(eq(payments.id, paymentId));
    await db.update(trials).set({ status: "booked", updatedAt: new Date() }).where(eq(trials.id, trialId));
  } else if (init.immediate === "failed") {
    await markPaymentFailed(paymentId);
  }
  return { trialId, reference: init.reference, authorizationUrl: init.authorizationUrl };
}

export async function latestQuotesFor(userId: string) {
  return db.select().from(quotes).where(eq(quotes.userId, userId)).orderBy(desc(quotes.createdAt));
}

export async function quoteHistory(quoteId: string) {
  const rows = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  const q = rows[0];
  if (!q) return [];
  const chain: typeof rows = [q];
  let cursor: string | null = q.supersedesId;
  while (cursor) {
    const prev = await db.select().from(quotes).where(eq(quotes.id, cursor));
    if (prev.length === 0) break;
    chain.unshift(prev[0]);
    cursor = prev[0].supersedesId;
  }
  // Newer versions that supersede this one.
  let next: string | null = quoteId;
  for (;;) {
    const newer = await db.select().from(quotes).where(eq(quotes.supersedesId, next));
    if (newer.length === 0) break;
    chain.push(newer[0]);
    next = newer[0].id;
  }
  return chain;
}
