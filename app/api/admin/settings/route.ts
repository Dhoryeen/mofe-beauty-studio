import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { settings } from "@/db/schema";

// Manager-editable business settings (allowlisted; everything else is code).
const EDITABLE = new Set([
  "deposit_pct",
  "quote_validity_days",
  "consultation_fee",
  "consultation_duration_min",
  "trial_fee",
  "complex_look_guidance",
  "free_reschedules_standard",
  "free_reschedule_notice_hours"
]);

export async function PATCH(req: Request) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });
  const body = await req.json();
  if (!body?.key || !EDITABLE.has(body.key)) {
    return NextResponse.json({ error: "Key is not editable" }, { status: 400 });
  }
  if (typeof body.value !== "string" || body.value.length > 2000) {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }
  await db
    .insert(settings)
    .values({ key: body.key, value: body.value })
    .onConflictDoUpdate({ target: settings.key, set: { value: body.value } });
  return NextResponse.json({ ok: true });
}
