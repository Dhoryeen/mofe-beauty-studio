import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { services, settings } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ConsultationInfoPage() {
  const rows = await db.select().from(settings);
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold">Consultations — how they work</h1>
      <div className="rounded-lg bg-card p-4 text-sm shadow-card">
        <p>{get("complex_look_guidance")}</p>
      </div>
      <ul className="grid gap-2 text-sm">
        <li>Fee: ₦{Number(get("consultation_fee") || "10000").toLocaleString("en-NG")} · about {get("consultation_duration_min") || "30"} minutes, in person or by video.</li>
        <li>The paid fee credits once against your beauty appointment — shown as a separate deduction, never more than the service total.</li>
        <li>Trial appointments are charged separately (₦{Number(get("trial_fee") || "15000").toLocaleString("en-NG")}) and never deducted from the service.</li>
        <li>Booking a consultation never books the beauty appointment itself.</li>
      </ul>
      <p><a href="/consultations/new" className="text-sm underline">Book a consultation →</a></p>
    </div>
  );
}
