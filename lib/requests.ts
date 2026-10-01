import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { bookingStaff, bookings, groups, quotes, services, settings } from "../db/schema";
import { staffFree } from "./slots";
import { createQuote } from "./quotes";

export async function requestHoldHours() {
  const rows = await db.select().from(settings).where(eq(settings.key, "request_hold_hours"));
  return Number(rows[0]?.value ?? "48");
}

// A date request alone never secures an appointment: status stays `request`
// with an explicit hold expiry until the studio reviews it.
export async function createRequest(opts: {
  userId: string;
  serviceId: string;
  lookId?: string;
  staffId?: string;
  location?: string;
  slotStart: string;
  readinessDeadline?: string;
  preferredTime?: string;
  groupId?: string;
}) {
  const svc = (await db.select().from(services).where(eq(services.id, opts.serviceId)))[0];
  if (!svc || !svc.active) throw Object.assign(new Error("Service unavailable"), { status: 400 });
  const start = new Date(opts.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("Pick a future date"), { status: 400 });
  }
  const end = new Date(start.getTime() + svc.durationMin * 60000);
  if (opts.staffId && !(await staffFree(opts.staffId, start, end))) {
    throw Object.assign(new Error("That time was just taken — pick another"), { status: 409 });
  }
  const hours = await requestHoldHours();
  const id = randomUUID();
  const now = new Date();
  const total = svc.priceNaira;
  await db.insert(bookings).values({
    id,
    userId: opts.userId,
    serviceId: svc.id,
    lookId: opts.lookId ?? null,
    status: "request",
    slotStart: start,
    slotEnd: end,
    readinessDeadline: opts.readinessDeadline ? new Date(opts.readinessDeadline) : null,
    preferredTime: opts.preferredTime ?? null,
    location: opts.location ?? null,
    holdUntil: new Date(now.getTime() + hours * 3600000),
    groupId: opts.groupId ?? null,
    totalNaira: total,
    depositNaira: Math.round(total * 0.3),
    paidNaira: 0,
    creditNaira: 0,
    paymentStatus: "unpaid",
    createdAt: now,
    updatedAt: now
  });
  if (opts.staffId) {
    await db.insert(bookingStaff).values({ bookingId: id, staffId: opts.staffId, kind: "primary" });
  }
  return { id };
}

export async function acceptRequest(managerId: string, bookingId: string, opts: { travelNaira?: number; note?: string }) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = rows[0];
  if (!b || b.status !== "request") throw Object.assign(new Error("Not a pending request"), { status: 400 });
  const result = await createQuote({
    userId: b.userId,
    serviceId: b.serviceId,
    lookId: b.lookId ?? undefined,
    bookingId: b.id,
    makeup: "",
    hairstyle: "",
    travelNaira: opts.travelNaira ?? 0,
    note: opts.note ?? "",
    createdBy: managerId,
    send: true
  });
  return result;
}

export async function declineRequest(bookingId: string) {
  await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
  return { ok: true };
}

export async function extendHold(bookingId: string, hours: number) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = rows[0];
  if (!b) throw Object.assign(new Error("Not found"), { status: 404 });
  const base = Math.max(new Date(b.holdUntil ?? 0).getTime(), Date.now());
  await db
    .update(bookings)
    .set({ holdUntil: new Date(base + hours * 3600000), updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));
  return { ok: true };
}

export function holdExpired(b: { holdUntil: Date | null; status: string }) {
  return b.holdUntil != null && new Date(b.holdUntil).getTime() < Date.now() && b.status === "request";
}

// Guards every payment attempt: requests pay only after quote approval,
// expired holds/quotes bounce back to studio review.
export async function bookingPayable(bookingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = rows[0];
  if (!b) return { ok: false, error: "Booking not found" };
  if (b.status === "request") {
    if (holdExpired(b)) return { ok: false, error: "The date hold expired — the studio must review it before payment" };
    return { ok: false, error: "Awaiting studio review and your quote approval before payment" };
  }
  if (b.groupId) {
    const g = (await db.select().from(groups).where(eq(groups.id, b.groupId)))[0];
    if (!g || !["awaiting_deposits", "confirmed"].includes(g.status)) {
      return { ok: false, error: "This group is not yet released for payment" };
    }
  }
  const qs = await db
    .select()
    .from(quotes)
    .where(eq(quotes.bookingId, bookingId))
    .orderBy(desc(quotes.version));
  const latest = qs.find((q) => q.status !== "draft" && q.status !== "superseded");
  if (latest && latest.status === "awaiting_approval" && latest.validUntil && new Date(latest.validUntil).getTime() < Date.now()) {
    return { ok: false, error: "The quote expired — studio review required before payment" };
  }
  return { ok: true };
}
