import { and, eq } from "drizzle-orm";
import { db } from "./db";
import {
  availabilityExceptions,
  availabilityRules,
  bookings,
  bookingStaff,
  staffProfiles,
  user
} from "../db/schema";

export type Staff = { id: string; name: string; craft: string; bio: string };
export type Slot = { start: string; end: string; staff: Staff[] };

const STEP_MIN = 30;
const HOLD_MS = 30 * 60 * 1000; // pending-payment holds release after 30 min

const CRAFTS: Record<string, string[]> = {
  makeup: ["makeup", "both"],
  hair: ["hair", "both"],
  combined: ["makeup", "hair", "both"]
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function staffForService(category: string): Promise<Staff[]> {
  const rows = await db
    .select({
      id: user.id,
      name: staffProfiles.displayName,
      craft: staffProfiles.craft,
      bio: staffProfiles.bio
    })
    .from(staffProfiles)
    .innerJoin(user, eq(user.id, staffProfiles.userId))
    .where(eq(staffProfiles.active, true));
  const allowed = CRAFTS[category] ?? CRAFTS.makeup;
  return rows.filter((r) => allowed.includes(r.craft));
}

async function blockedRanges(staffId: string, key: string, from: Date, to: Date) {
  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.staffId, staffId));
  const weekday = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getDay();
  const windows = rules
    .filter((r) => r.weekday === weekday)
    .map((r) => ({
      s: new Date(from.getTime()).setHours(0, r.startMin, 0, 0),
      e: new Date(from.getTime()).setHours(0, r.endMin, 0, 0)
    }));
  if (windows.length === 0) return { windows, blocked: [] as Array<[number, number]> };

  const blocked: Array<[number, number]> = [];
  const exs = await db
    .select()
    .from(availabilityExceptions)
    .where(and(eq(availabilityExceptions.staffId, staffId), eq(availabilityExceptions.day, key)));
  for (const ex of exs) {
    if (ex.startMin == null || ex.endMin == null) {
      blocked.push([from.getTime(), to.getTime()]);
    } else {
      blocked.push([
        new Date(from.getTime()).setHours(0, ex.startMin, 0, 0),
        new Date(from.getTime()).setHours(0, ex.endMin, 0, 0)
      ]);
    }
  }

  const holds = await db
    .select()
    .from(bookings)
    .where(eq(bookings.status, "confirmed"));
  const pendings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.status, "pending_payment"));
  const mine = [...holds, ...pendings.filter((b) => Date.now() - new Date(b.updatedAt).getTime() < HOLD_MS)];
  const links = await db.select().from(bookingStaff);
  const myBookingIds = new Set(links.filter((l) => l.staffId === staffId).map((l) => l.bookingId));
  for (const b of mine) {
    if (!myBookingIds.has(b.id)) continue;
    blocked.push([new Date(b.slotStart).getTime(), new Date(b.slotEnd).getTime()]);
  }
  return { windows, blocked };
}

function overlaps(s: number, e: number, blocked: Array<[number, number]>) {
  return blocked.some(([bs, be]) => s < be && e > bs);
}

export async function staffFree(
  staffId: string,
  start: Date,
  end: Date,
  ignoreBookingId?: string
): Promise<boolean> {
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const { windows, blocked } = await blockedRanges(staffId, dayKey(day), day, new Date(day.getTime() + 86400000));
  const s = start.getTime();
  const e = end.getTime();
  if (!windows.some((w) => s >= w.s && e <= w.e)) return false;
  let ranges = blocked;
  if (ignoreBookingId) {
    const rows = await db.select().from(bookings).where(eq(bookings.id, ignoreBookingId));
    if (rows[0]) {
      const is = new Date(rows[0].slotStart).getTime();
      const ie = new Date(rows[0].slotEnd).getTime();
      ranges = blocked.filter(([bs, be]) => !(bs === is && be === ie));
    }
  }
  return !overlaps(s, e, ranges);
}

export async function slotsForStaff(
  staffId: string,
  key: string,
  durationMin: number,
  now = new Date()
): Promise<Array<{ start: string; end: string }>> {
  const [y, m, d] = key.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const { windows, blocked } = await blockedRanges(staffId, key, day, new Date(day.getTime() + 86400000));
  const out: Array<{ start: string; end: string }> = [];
  for (const w of windows) {
    for (let s = w.s; s + durationMin * 60000 <= w.e; s += STEP_MIN * 60000) {
      const e = s + durationMin * 60000;
      if (s <= now.getTime()) continue;
      if (!overlaps(s, e, blocked)) out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
    }
  }
  return out;
}
