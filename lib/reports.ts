import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  bookingStaff,
  bookings,
  messages,
  payments,
  prepTasks,
  quotes,
  refunds,
  rescheduleRequests,
  reviews,
  services,
  user,
  waitlist
} from "../db/schema";
import { holdExpired } from "./requests";

export async function dashboard() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const allBookings = await db.select().from(bookings).orderBy(desc(bookings.slotStart));
  const today = allBookings.filter((b) => new Date(b.slotStart) >= dayStart && new Date(b.slotStart) < dayEnd && !["cancelled"].includes(b.status));
  const requests = allBookings.filter((b) => b.status === "request");
  const overdueHolds = requests.filter((b) => holdExpired(b));
  const unpaid = allBookings.filter((b) => ["confirmed"].includes(b.status) && b.paymentStatus !== "paid");

  const pendingReschedules = await db.select().from(rescheduleRequests).where(eq(rescheduleRequests.status, "pending"));
  const pendingRefunds = await db.select().from(refunds).where(eq(refunds.status, "pending"));
  const openWaitlist = await db.select().from(waitlist).where(eq(waitlist.status, "open"));

  // Threads where the client spoke last.
  const unanswered: { bookingId: string; at: string }[] = [];
  for (const b of allBookings.filter((x) => ["confirmed", "pending_payment"].includes(x.status)).slice(0, 60)) {
    const thread = await db.select().from(messages).where(eq(messages.bookingId, b.id)).orderBy(desc(messages.createdAt));
    if (thread[0] && thread[0].authorId === b.userId) {
      unanswered.push({ bookingId: b.id, at: new Date(thread[0].createdAt).toLocaleString() });
    }
  }

  const overduePrep = await db.select().from(prepTasks).where(and(eq(prepTasks.status, "open")));
  const overdue = overduePrep.filter((t) => t.dueAt && new Date(t.dueAt) < now);

  const draftQuotes = await db.select().from(quotes).where(eq(quotes.status, "draft"));

  // Staff schedules: upcoming confirmed bookings per specialist.
  const staffRows = await db.select().from(user).where(eq(user.role, "beautician_consultant"));
  const schedules = await Promise.all(
    staffRows.map(async (s) => {
      const links = await db.select().from(bookingStaff).where(eq(bookingStaff.staffId, s.id));
      const ids = new Set(links.map((l) => l.bookingId));
      const upcoming = allBookings
        .filter((b) => ids.has(b.id) && new Date(b.slotEnd) >= now && b.status === "confirmed")
        .slice(0, 8);
      return { id: s.id, name: s.name, upcoming: upcoming.map((b) => ({ id: b.id, slotStart: b.slotStart, status: b.status })) };
    })
  );

  // Reports: money collected vs service value; balances; completions; popularity; repeats.
  const pays = await db.select().from(payments);
  const collected = pays.filter((p) => p.status === "success").reduce((a, p) => a + p.amountNaira, 0);
  const refundedRows = await db.select().from(refunds).where(eq(refunds.status, "processed"));
  const refunded = refundedRows.reduce((a, r) => a + r.amountNaira, 0);
  const live = allBookings.filter((b) => ["confirmed", "completed"].includes(b.status));
  const outstanding = live.reduce((a, b) => a + Math.max(b.totalNaira - b.creditNaira - b.paidNaira, 0), 0);
  const serviceValue = live.reduce((a, b) => a + b.totalNaira, 0);
  const completions = allBookings.filter((b) => b.status === "completed").length;
  const svcCounts: Record<string, number> = {};
  for (const b of allBookings.filter((b) => b.status !== "cancelled")) svcCounts[b.serviceId] = (svcCounts[b.serviceId] ?? 0) + 1;
  const svcRows = await db.select().from(services);
  const popular = Object.entries(svcCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ name: svcRows.find((s) => s.id === id)?.name ?? id, bookings: n }));
  const perUser: Record<string, number> = {};
  for (const b of allBookings.filter((b) => b.status !== "cancelled")) perUser[b.userId] = (perUser[b.userId] ?? 0) + 1;
  const clients = Object.keys(perUser).length;
  const repeats = Object.values(perUser).filter((n) => n > 1).length;

  const publishedReviews = await db.select().from(reviews).where(eq(reviews.status, "published"));

  return {
    today,
    requests: requests.length,
    overdueHolds: overdueHolds.map((b) => b.id),
    unpaid,
    pendingReschedules: pendingReschedules.length,
    pendingRefunds: pendingRefunds.length,
    openWaitlist: openWaitlist.length,
    unanswered,
    overduePrep: overdue.length,
    draftQuotes: draftQuotes.length,
    schedules,
    reports: { collected, refunded, outstanding, serviceValue, completions, popular, clients, repeats, publishedReviews: publishedReviews.length }
  };
}
