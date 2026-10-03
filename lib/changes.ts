import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import {
  bookings,
  bookingStaff,
  looks,
  lookImages,
  payments,
  photoConsents,
  refunds,
  rescheduleRequests,
  reviews,
  services,
  settings,
  user
} from "../db/schema";
import { staffFree } from "./slots";
import { applyPaymentSuccess } from "./payments/reconcile";
import { paystackRefund } from "./payments/paystack";
import { providerName } from "./payments";
import {
  refundDecidedEmail,
  rescheduleNoticeEmail,
  reviewRequestEmail,
  sendEmail
} from "./email";
async function numSetting(key: string, fallback: number) {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return Number(rows[0]?.value ?? String(fallback));
}

async function textSetting(key: string, fallback: string) {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value ?? fallback;
}

export type BookingRow = typeof bookings.$inferSelect;

// Standard self-serve when: no group, in-studio, non-complex, enough notice,
// free reschedules left. Everything else routes to manager approval.
export async function reschedulePolicy(b: BookingRow) {
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const free = await numSetting("free_reschedules_standard", 1);
  const noticeHrs = await numSetting("free_reschedule_notice_hours", 48);
  const hoursLeft = (new Date(b.slotStart).getTime() - Date.now()) / 3600000;
  const routed =
    !!b.groupId || !!b.location || !!svc?.consultRequired || hoursLeft < noticeHrs || b.rescheduleCount >= free;
  return {
    mode: routed ? ("request" as const) : ("instant" as const),
    reason: routed
      ? "This change needs studio approval (group, off-site, complex, short notice, or free reschedules used)."
      : `Free self-serve reschedule (${b.rescheduleCount + 1} of ${free}), subject to availability.`,
    free,
    noticeHrs
  };
}

async function notifyParties(b: BookingRow, html: (name: string) => { subject: string; html: string }) {
  const owner = (await db.select().from(user).where(eq(user.id, b.userId)))[0];
  if (owner?.email) {
    const m = html(owner.name);
    await sendEmail({ to: owner.email, subject: m.subject, html: m.html });
  }
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id));
  for (const l of links) {
    const s = (await db.select().from(user).where(eq(user.id, l.staffId)))[0];
    if (s?.email && s.id !== b.userId) {
      const m = html(s.name);
      await sendEmail({ to: s.email, subject: m.subject, html: m.html });
    }
  }
}

export async function applyReschedule(bookingId: string, newStart: Date) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = rows[0];
  if (!b) throw Object.assign(new Error("Not found"), { status: 404 });
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const end = new Date(newStart.getTime() + (svc?.durationMin ?? 60) * 60000);
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id));
  for (const l of links) {
    if (!(await staffFree(l.staffId, newStart, end, b.id))) {
      throw Object.assign(new Error("That slot is taken — pick another"), { status: 409 });
    }
  }
  const oldSlot = new Date(b.slotStart).toLocaleString();
  await db
    .update(bookings)
    .set({ slotStart: newStart, slotEnd: end, rescheduleCount: b.rescheduleCount + 1, updatedAt: new Date() })
    .where(eq(bookings.id, b.id));
  await notifyParties(b, (name) =>
    rescheduleNoticeEmail({ name, service: svc?.name ?? "Service", oldSlot, newSlot: newStart.toLocaleString(), bookingId: b.id })
  );
  return { ok: true };
}

export async function requestReschedule(userId: string, bookingId: string, slotStart: string) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = rows[0];
  if (!b || b.userId !== userId) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!["confirmed", "pending_payment"].includes(b.status)) {
    throw Object.assign(new Error("This booking can no longer be changed"), { status: 400 });
  }
  const policy = await reschedulePolicy(b);
  const start = new Date(slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("Pick a future slot"), { status: 400 });
  }
  if (policy.mode === "instant") return applyReschedule(b.id, start);
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const id = randomUUID();
  await db.insert(rescheduleRequests).values({
    id,
    bookingId: b.id,
    requestedBy: userId,
    newStart: start,
    newEnd: new Date(start.getTime() + (svc?.durationMin ?? 60) * 60000),
    status: "pending"
  });
  return { requested: true, id };
}

export async function decideReschedule(managerId: string, id: string, approve: boolean, note?: string) {
  const rows = await db.select().from(rescheduleRequests).where(eq(rescheduleRequests.id, id));
  const r = rows[0];
  if (!r || r.status !== "pending") throw Object.assign(new Error("Not found"), { status: 404 });
  if (!approve) {
    await db.update(rescheduleRequests).set({ status: "rejected", decisionNote: note ?? "", decidedBy: managerId }).where(eq(rescheduleRequests.id, r.id));
    return { ok: true };
  }
  // Re-check capacity at decision time — the slot may have filled since.
  const links = await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, r.bookingId));
  for (const l of links) {
    if (!(await staffFree(l.staffId, new Date(r.newStart), new Date(r.newEnd), r.bookingId))) {
      throw Object.assign(new Error("That slot has since been taken"), { status: 409 });
    }
  }
  await db.update(rescheduleRequests).set({ status: "approved", decisionNote: note ?? "", decidedBy: managerId }).where(eq(rescheduleRequests.id, r.id));
  await applyReschedule(r.bookingId, new Date(r.newStart));
  return { ok: true };
}

// --- Cancel + refunds ---

export async function cancelPreview(bookingId: string) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b) throw Object.assign(new Error("Not found"), { status: 404 });
  const terms = await textSetting("cancellation_terms", "");
  const hoursLeft = (new Date(b.slotStart).getTime() - Date.now()) / 3600000;
  const fullRefund = hoursLeft > 48;
  return {
    paidNaira: b.paidNaira,
    refundPreviewNaira: fullRefund ? b.paidNaira : b.paidNaira,
    discretion: !fullRefund,
    policy: terms,
    message: fullRefund
      ? `Cancelling refunds ${b.paidNaira > 0 ? "₦" + b.paidNaira.toLocaleString("en-NG") : "nothing (nothing paid)"} in full.`
      : "Inside 48 hours: any refund is at management discretion — the amounts above are indicative, not promised."
  };
}

export async function cancelBooking(userId: string, bookingId: string, reason?: string) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = rows[0];
  if (!b || b.userId !== userId) throw Object.assign(new Error("Not found"), { status: 404 });
  if (["cancelled", "completed"].includes(b.status)) throw Object.assign(new Error("Already closed"), { status: 400 });
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(bookings).set({ status: "cancelled", updatedAt: now }).where(eq(bookings.id, b.id));
    await tx.update(rescheduleRequests).set({ status: "rejected", decisionNote: "Booking cancelled" }).where(and(eq(rescheduleRequests.bookingId, b.id), eq(rescheduleRequests.status, "pending")));
    if (b.paidNaira > 0) {
      const pays = await db.select().from(payments).where(eq(payments.bookingId, b.id));
      const lastSuccess = [...pays].reverse().find((p) => p.status === "success");
      await tx.insert(refunds).values({
        id: randomUUID(),
        bookingId: b.id,
        paymentId: lastSuccess?.id ?? null,
        amountNaira: b.paidNaira,
        reason: reason ?? "",
        status: "pending"
      });
      await tx.update(bookings).set({ paymentStatus: "refund_pending" }).where(eq(bookings.id, b.id));
    }
  });
  return { ok: true };
}

export async function decideRefund(managerId: string, id: string, approve: boolean, note?: string) {
  const rows = await db.select().from(refunds).where(eq(refunds.id, id));
  const r = rows[0];
  if (!r || r.status !== "pending") throw Object.assign(new Error("Not found"), { status: 404 });
  if (!approve) {
    await db.update(refunds).set({ status: "rejected", decisionNote: note ?? "", decidedBy: managerId }).where(eq(refunds.id, r.id));
    await db.update(bookings).set({ paymentStatus: "partial" }).where(eq(bookings.id, r.bookingId));
    await notifyRefund(r.bookingId, r.amountNaira, false, note ?? "");
    return { ok: true };
  }
  const pay = r.paymentId ? (await db.select().from(payments).where(eq(payments.id, r.paymentId)))[0] : undefined;
  if (pay?.provider === "paystack") {
    await paystackRefund(pay.reference, r.amountNaira);
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(refunds).set({ status: "processed", decisionNote: note ?? "", decidedBy: managerId }).where(eq(refunds.id, r.id));
    if (pay) await tx.update(payments).set({ status: "refunded", updatedAt: now }).where(eq(payments.id, pay.id));
    await tx.update(bookings).set({ paymentStatus: "refunded", paidNaira: 0, updatedAt: now }).where(eq(bookings.id, r.bookingId));
  });
  await notifyRefund(r.bookingId, r.amountNaira, true, note ?? "");
  return { ok: true };
}

async function notifyRefund(bookingId: string, amount: number, approved: boolean, note: string) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b) return;
  const u = (await db.select().from(user).where(eq(user.id, b.userId)))[0];
  if (!u?.email) return;
  const m = refundDecidedEmail({ name: u.name, amount, approved, note, bookingId });
  await sendEmail({ to: u.email, subject: m.subject, html: m.html });
}

// --- Completion, reviews, final looks ---

export async function completeBooking(actorId: string, bookingId: string, aftercare?: string) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b) throw Object.assign(new Error("Not found"), { status: 404 });
  const role = (await db.select().from(user).where(eq(user.id, actorId)))[0]?.role;
  const assigned =
    role === "manager" ||
    (await db.select().from(bookingStaff).where(eq(bookingStaff.bookingId, b.id))).some((l) => l.staffId === actorId);
  if (!assigned) throw Object.assign(new Error("Assigned staff or manager only"), { status: 403 });
  if (b.status !== "confirmed") throw Object.assign(new Error("Only confirmed bookings complete"), { status: 400 });
  await db
    .update(bookings)
    .set({ status: "completed", aftercare: aftercare ?? b.aftercare, updatedAt: new Date() })
    .where(eq(bookings.id, b.id));
  const u = (await db.select().from(user).where(eq(user.id, b.userId)))[0];
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  if (u?.email) {
    const m = reviewRequestEmail({ name: u.name, service: svc?.name ?? "Service", bookingId: b.id });
    await sendEmail({ to: u.email, subject: m.subject, html: m.html });
  }
  return { ok: true };
}

export async function submitReview(userId: string, bookingId: string, rating: number, body?: string, publishConsent?: boolean) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b || b.userId !== userId) throw Object.assign(new Error("Not found"), { status: 404 });
  if (b.status !== "completed") throw Object.assign(new Error("Reviews open after completion"), { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Object.assign(new Error("Rating 1–5"), { status: 400 });
  const dup = await db.select().from(reviews).where(eq(reviews.bookingId, b.id));
  if (dup.length > 0) throw Object.assign(new Error("One review per booking"), { status: 409 });
  const id = randomUUID();
  await db.insert(reviews).values({ id, bookingId: b.id, userId, rating, body: body ?? "", publishConsent: !!publishConsent, status: "private" });
  return { id };
}

export async function saveFinalLook(userId: string, bookingId: string, opts: { note?: string; publishConsent?: boolean }) {
  const b = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0];
  if (!b || b.userId !== userId) throw Object.assign(new Error("Not found"), { status: 404 });
  if (b.status !== "completed") throw Object.assign(new Error("Final looks save after completion"), { status: 400 });
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const now = new Date();
  const id = randomUUID();
  await db.insert(looks).values({
    id,
    userId,
    name: `Final: ${svc?.name ?? "look"} · ${new Date(b.slotStart).toLocaleDateString()}`,
    occasion: "",
    makeupPreferences: "",
    hairstyle: "",
    hairLengthTexture: "",
    finish: "",
    avoidDetails: "",
    sensitivities: "",
    productPreferences: opts.note ?? "",
    status: "draft",
    createdAt: now,
    updatedAt: now
  });
  const srcImages = b.lookId ? await db.select().from(lookImages).where(eq(lookImages.lookId, b.lookId)) : [];
  for (const img of srcImages) {
    await db.insert(lookImages).values({ id: randomUUID(), lookId: id, url: img.url, source: img.source, galleryItemId: img.galleryItemId });
    await db.insert(photoConsents).values({ id: randomUUID(), userId, imageUrl: img.url, purpose: "private_save", granted: true });
    if (opts.publishConsent) {
      await db.insert(photoConsents).values({ id: randomUUID(), userId, imageUrl: img.url, purpose: "public_use", granted: true });
    }
  }
  return { id };
}
