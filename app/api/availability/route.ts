import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { services } from "@/db/schema";
import { slotsForStaff, staffForService, type Slot } from "@/lib/slots";

// GET /api/availability?serviceId=…&date=YYYY-MM-DD&staffId=…|match
export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId");
  const date = url.searchParams.get("date");
  const staffId = url.searchParams.get("staffId") ?? "match";
  if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "serviceId and date (YYYY-MM-DD) required" }, { status: 400 });
  }
  const svcRows = await db.select().from(services).where(eq(services.id, serviceId));
  const svc = svcRows[0];
  if (!svc || !svc.active) return NextResponse.json({ error: "Service unavailable" }, { status: 404 });

  const staff = await staffForService(svc.category);
  const needTwo = svc.category === "combined";
  let makeupPool = staff.filter((s) => s.craft === "makeup" || s.craft === "both");
  let hairPool = staff.filter((s) => s.craft === "hair" || s.craft === "both");
  if (staffId !== "match") {
    const chosen = staff.find((s) => s.id === staffId);
    if (!chosen) return NextResponse.json({ error: "Unknown specialist" }, { status: 400 });
    if (needTwo) {
      // Pair the chosen specialist with any available counterpart.
      if (chosen.craft === "makeup" || chosen.craft === "both") makeupPool = makeupPool.filter((s) => s.id === chosen.id);
      if (chosen.craft === "hair" || chosen.craft === "both") hairPool = hairPool.filter((s) => s.id === chosen.id);
    } else {
      makeupPool = makeupPool.filter((s) => s.id === chosen.id);
      hairPool = hairPool.filter((s) => s.id === chosen.id);
    }
  }

  const cache = new Map<string, Array<{ start: string; end: string }>>();
  const day = date;
  async function fetchSlots(id: string) {
    if (!cache.has(id)) cache.set(id, await slotsForStaff(id, day, svc.durationMin));
    return cache.get(id)!;
  }

  const slots: Slot[] = [];
  if (!needTwo) {
    const pool = svc.category === "hair" ? hairPool : makeupPool;
    for (const s of pool) {
      for (const t of await fetchSlots(s.id)) slots.push({ ...t, staff: [s] });
    }
  } else {
    for (const m of makeupPool) {
      const mt = await fetchSlots(m.id);
      for (const h of hairPool) {
        if (h.id === m.id && m.craft === "both") {
          for (const t of mt) slots.push({ ...t, staff: [m] });
          continue;
        }
        const ht = new Set((await fetchSlots(h.id)).map((t) => t.start));
        for (const t of mt) {
          if (ht.has(t.start)) slots.push({ ...t, staff: [m, h] });
        }
      }
    }
  }
  slots.sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json({ staff, slots: slots.slice(0, 60), durationMin: svc.durationMin });
}
