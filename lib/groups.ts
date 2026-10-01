import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import {
  bookings,
  groupInvites,
  groupMembers,
  groups,
  payments,
  quotes,
  services,
  user
} from "../db/schema";
import { bookingPayable } from "./requests";
import { applyPaymentSuccess, markPaymentFailed } from "./payments/reconcile";
import { initializePayment, providerName } from "./payments";

export async function createGroup(
  organiserId: string,
  opts: { name: string; eventDate?: string; location?: string; readinessDeadline?: string; sizeInt?: number; payMode?: string; note?: string }
) {
  if (!opts.name?.trim()) throw Object.assign(new Error("Name the group (e.g. event)"), { status: 400 });
  const id = randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(groups).values({
      id,
      organiserId,
      name: opts.name.trim(),
      eventDate: opts.eventDate ? new Date(opts.eventDate) : null,
      location: opts.location ?? null,
      readinessDeadline: opts.readinessDeadline ? new Date(opts.readinessDeadline) : null,
      sizeInt: opts.sizeInt ?? 1,
      payMode: opts.payMode === "organiser" ? "organiser" : "split",
      sharedNaira: 0,
      sharedNote: "",
      status: "request",
      note: opts.note ?? "",
      createdAt: now,
      updatedAt: now
    });
    await tx.insert(groupMembers).values({ id: randomUUID(), groupId: id, userId: organiserId, role: "organiser" });
  });
  return { id };
}

export async function myGroups(userId: string) {
  const links = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
  const ids = links.map((l) => l.groupId);
  const all = await db.select().from(groups);
  return all.filter((g) => g.organiserId === userId || ids.includes(g.id));
}

export async function membership(groupId: string, userId: string) {
  const rows = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return rows[0] ?? null;
}

export async function inviteMember(organiserId: string, groupId: string, email: string) {
  const g = (await db.select().from(groups).where(eq(groups.id, groupId)))[0];
  if (!g || g.organiserId !== organiserId) throw Object.assign(new Error("Not found"), { status: 404 });
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) throw Object.assign(new Error("Invalid email"), { status: 400 });
  const existing = (await db.select().from(user).where(eq(user.email, clean)))[0];
  if (existing) {
    const mem = await membership(groupId, existing.id);
    if (!mem) {
      await db.insert(groupMembers).values({ id: randomUUID(), groupId, userId: existing.id, role: "member" });
    }
    await db
      .insert(groupInvites)
      .values({ id: randomUUID(), groupId, email: clean, status: "accepted" })
      .onConflictDoNothing();
    return { added: true };
  }
  const dup = await db
    .select()
    .from(groupInvites)
    .where(and(eq(groupInvites.groupId, groupId), eq(groupInvites.email, clean)));
  if (dup.length === 0) {
    await db.insert(groupInvites).values({ id: randomUUID(), groupId, email: clean, status: "pending" });
  }
  return { added: false, pending: true };
}

export async function readiness(groupId: string) {
  const links = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  const out = [];
  for (const m of links) {
    if (m.role === "organiser") continue;
    const u = (await db.select().from(user).where(eq(user.id, m.userId)))[0];
    const bRows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, m.userId), eq(bookings.groupId, groupId)));
    const b = bRows[0] ?? null;
    let quoteStatus: string | null = null;
    if (b) {
      const qs = await db.select().from(quotes).where(eq(quotes.bookingId, b.id));
      const latest = qs.filter((q) => q.status !== "draft" && q.status !== "superseded").sort((x, y) => y.version - x.version)[0];
      quoteStatus = latest?.status ?? null;
    }
    const missing: string[] = [];
    if (!b) missing.push("no service selected yet — booking not confirmed until a service is chosen");
    else {
      if (!quoteStatus || quoteStatus !== "approved") missing.push("look/quote awaiting approval");
      if (b.paymentStatus !== "paid" && b.paymentStatus !== "partial") missing.push("deposit unpaid — booking not confirmed until deposits are collected");
    }
    const svcName = b ? (await db.select().from(services).where(eq(services.id, b.serviceId)))[0]?.name ?? "" : "";
    out.push({
      userId: m.userId,
      email: u?.email ?? "",
      serviceName: svcName,
      slotStart: b?.slotStart ?? null,
      quoteStatus,
      paymentStatus: b?.paymentStatus ?? null,
      bookingStatus: b?.status ?? null,
      bookingId: b?.id ?? null,
      missing
    });
  }
  return out;
}

// Organiser covers a member's outstanding amount (split or organiser pay mode).
export async function coverBooking(organiserId: string, groupId: string, bookingId: string, email: string, simulate?: string) {
  const g = (await db.select().from(groups).where(eq(groups.id, groupId)))[0];
  if (!g || g.organiserId !== organiserId) throw Object.assign(new Error("Not found"), { status: 404 });
  const bRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = bRows[0];
  if (!b || b.groupId !== groupId) throw Object.assign(new Error("Not found"), { status: 404 });
  const gate = await bookingPayable(b.id);
  if (!gate.ok) throw Object.assign(new Error(gate.error), { status: 400 });
  const remaining = b.totalNaira - b.creditNaira - b.paidNaira;
  if (remaining <= 0) throw Object.assign(new Error("Nothing owed"), { status: 400 });

  const paymentId = randomUUID();
  const now = new Date();
  const init = await initializePayment({ email, amountNaira: remaining, simulate });
  await db.insert(payments).values({
    id: paymentId,
    bookingId: b.id,
    consultationId: null,
    trialId: null,
    provider: providerName(),
    reference: init.reference,
    amountNaira: remaining,
    kind: "balance",
    status: "pending",
    raw: { coveredBy: organiserId },
    createdAt: now,
    updatedAt: now
  });
  if (init.immediate === "success") await applyPaymentSuccess(paymentId);
  else if (init.immediate === "failed") await markPaymentFailed(paymentId);
  return { reference: init.reference, authorizationUrl: init.authorizationUrl };
}

export async function setGroupStatus(groupId: string, status: string, fields: Partial<{ sharedNaira: number; sharedNote: string; note: string }>) {
  if (!["request", "quoted", "awaiting_deposits", "confirmed", "cancelled"].includes(status)) {
    throw Object.assign(new Error("Invalid status"), { status: 400 });
  }
  const patch: Record<string, unknown> = { status, updatedAt: new Date() };
  if (fields.sharedNaira !== undefined) patch.sharedNaira = fields.sharedNaira;
  if (fields.sharedNote !== undefined) patch.sharedNote = fields.sharedNote;
  if (fields.note !== undefined) patch.note = fields.note;
  await db.update(groups).set(patch).where(eq(groups.id, groupId));
  return { ok: true };
}

export async function organiserUpdate(groupId: string, organiserId: string, patch: Record<string, unknown>) {
  const g = (await db.select().from(groups).where(eq(groups.id, groupId)))[0];
  if (!g || g.organiserId !== organiserId) throw Object.assign(new Error("Not found"), { status: 404 });
  const next: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["name", "eventDate", "location", "readinessDeadline", "sizeInt", "payMode", "note"]) {
    if (patch[k] !== undefined) {
      next[k] =
        k === "sizeInt"
          ? Number(patch[k]) || 1
          : k === "payMode"
            ? patch[k] === "organiser"
              ? "organiser"
              : "split"
            : k === "eventDate" || k === "readinessDeadline"
              ? patch[k]
                ? new Date(patch[k] as string)
                : null
              : patch[k];
    }
  }
  // Any material change after review sends the group back for studio review.
  if (g.status !== "request" && (next.sizeInt !== undefined || next.eventDate !== undefined || next.location !== undefined)) {
    next.status = "request";
  }
  await db.update(groups).set(next).where(eq(groups.id, groupId));
  return { ok: true };
}
