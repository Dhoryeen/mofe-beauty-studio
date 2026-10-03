import { eq } from "drizzle-orm";
import { db } from "./db";
import { bookings, consultations, prepTasks, quotes, services } from "../db/schema";
import { effectiveStatus } from "./quotes";

export type Step = { key: string; label: string; state: "done" | "current" | "todo" };
export type NextAction = { text: string; owner: "client" | "studio"; deadline?: string };

export async function bookingProgress(bookingId: string): Promise<{ steps: Step[]; next: NextAction } | null> {
  const bRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const b = bRows[0];
  if (!b) return null;
  const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
  const qs = await db.select().from(quotes).where(eq(quotes.bookingId, b.id));
  const live = qs.filter((q) => q.status !== "draft" && q.status !== "superseded");
  const approved = live.some((q) => effectiveStatus(q) === "approved");
  const awaiting = live.some((q) => effectiveStatus(q) === "awaiting_approval");
  const tasks = await db.select().from(prepTasks).where(eq(prepTasks.bookingId, b.id));
  const openTasks = tasks.filter((t) => t.status === "open");
  const consults = await db.select().from(consultations).where(eq(consultations.userId, b.userId));
  const relevant = consults.filter((c) => c.serviceId === b.serviceId || (b.lookId && c.lookId === b.lookId));
  const consultDone = relevant.some((c) => c.status === "completed");
  const consultBooked = relevant.some((c) => c.status === "booked");

  const steps: Step[] = [];
  const isRequestFlow = b.holdUntil != null || b.groupId != null || b.location != null;
  if (isRequestFlow) {
    steps.push({ key: "request", label: "Request received", state: b.status === "request" ? "current" : "done" });
  }
  if ((svc?.consultRequired || relevant.length > 0) && b.status !== "cancelled") {
    steps.push({
      key: "consult",
      label: "Consultation booked and completed",
      state: consultDone ? "done" : consultBooked ? "current" : "todo"
    });
  }
  if (live.length > 0) {
    steps.push({ key: "awaiting", label: "Look and quote awaiting approval", state: approved ? "done" : "current" });
    steps.push({ key: "approved", label: "Look approved", state: approved ? "done" : awaiting ? "todo" : "todo" });
  }
  const reached = ["confirmed", "completed"].includes(b.status);
  steps.push({ key: "confirmed", label: "Appointment confirmed", state: b.status === "completed" ? "done" : ["confirmed"].includes(b.status) ? "done" : b.status === "request" || b.status === "pending_payment" ? "todo" : "current" });
  if (b.status === "confirmed" || b.status === "completed") {
    const prepState = tasks.length === 0 ? "current" : openTasks.length === 0 ? "done" : "current";
    steps.push({ key: "prep", label: "Preparation in progress", state: b.status === "completed" ? "done" : prepState });
    steps.push({ key: "ready", label: "Ready for appointment", state: b.status === "completed" ? "done" : tasks.length > 0 && openTasks.length === 0 ? "done" : "todo" });
  }
  steps.push({ key: "completed", label: "Service completed", state: b.status === "completed" ? "done" : b.status === "cancelled" ? "todo" : "todo" });
  void reached;

  const owed = b.totalNaira - b.creditNaira - b.paidNaira;
  let next: NextAction = { text: "Nothing outstanding.", owner: "client" };
  if (b.status === "cancelled") next = { text: "Booking cancelled.", owner: "client" };
  else if (b.status === "request") next = { text: "Studio review — the studio confirms staffing and pricing.", owner: "studio", deadline: b.holdUntil ? new Date(b.holdUntil).toLocaleString() : undefined };
  else if (b.status === "pending_payment") next = { text: `Pay the outstanding amount (${owed > 0 ? "₦" + owed.toLocaleString("en-NG") : "due"}).`, owner: "client" };
  else if (b.status === "confirmed" && openTasks.some((t) => t.owner === "client")) next = { text: `Complete preparation: ${openTasks.filter((t) => t.owner === "client")[0].title}.`, owner: "client" };
  else if (b.status === "confirmed") next = { text: "Studio preparation is underway — watch for updates.", owner: "studio" };
  else if (b.status === "completed" && owed > 0) next = { text: `Settle the remaining ₦${owed.toLocaleString("en-NG")}.`, owner: "client" };
  else if (b.status === "completed") next = { text: "Service complete — consider leaving a review.", owner: "client" };
  return { steps, next };
}
