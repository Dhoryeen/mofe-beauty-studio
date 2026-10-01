import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { staffProfiles, user } from "@/db/schema";
import { consultationDurationMin } from "@/lib/consultations";
import { slotsForStaff } from "@/lib/slots";

// GET /api/consultation-slots?date=YYYY-MM-DD — any active beautician, consult length.
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date (YYYY-MM-DD) required" }, { status: 400 });
  }
  const dur = await consultationDurationMin();
  const staff = await db
    .select({ id: user.id, name: staffProfiles.displayName })
    .from(staffProfiles)
    .innerJoin(user, eq(user.id, staffProfiles.userId))
    .where(eq(staffProfiles.active, true));
  const slots = [];
  for (const s of staff) {
    for (const t of await slotsForStaff(s.id, date, dur)) slots.push({ ...t, staff: [s] });
  }
  slots.sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json({ slots: slots.slice(0, 40), durationMin: dur });
}
