// Sends 48h and 24h appointment reminders for confirmed bookings, once each.
// Usage: npm run notify:reminders (schedule with Task Scheduler / cron for production rhythm)
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { bookings, reminders, services, user } from "../db/schema";
import { reminderEmail, sendEmail } from "../lib/email";

const WINDOW_HRS = 3; // send when the slot falls inside [target-3h, target]

async function due(kind: "48h" | "24h", hours: number) {
  const now = Date.now();
  const lo = now + (hours - WINDOW_HRS) * 3600000;
  const hi = now + hours * 3600000;
  const rows = await db.select().from(bookings).where(eq(bookings.status, "confirmed"));
  let sent = 0;
  for (const b of rows) {
    const t = new Date(b.slotStart).getTime();
    if (t < lo || t > hi) continue;
    const done = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.bookingId, b.id), eq(reminders.kind, kind)));
    if (done.length > 0) continue;
    const u = (await db.select().from(user).where(eq(user.id, b.userId)))[0];
    const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
    if (u?.email) {
      const m = reminderEmail({
        name: u.name,
        service: svc?.name ?? "Service",
        slot: new Date(b.slotStart).toLocaleString(),
        kind,
        bookingId: b.id
      });
      if (await sendEmail({ to: u.email, subject: m.subject, html: m.html })) {
        await db.insert(reminders).values({ id: randomUUID(), bookingId: b.id, kind });
        sent++;
      }
    }
  }
  return sent;
}

async function main() {
  const a = await due("48h", 48);
  const b = await due("24h", 24);
  console.log(`reminders sent: 48h=${a} 24h=${b}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
