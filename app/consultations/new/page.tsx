import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { services, settings, staffProfiles, user } from "@/db/schema";
import { ConsultationBook } from "@/components/ConsultQuote";

export const dynamic = "force-dynamic";

export default async function NewConsultationPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const svcRows = await db.select().from(services);
  const settingRows = await db.select().from(settings);
  const fee = Number(settingRows.find((r) => r.key === "consultation_fee")?.value ?? "10000");
  const duration = settingRows.find((r) => r.key === "consultation_duration_min")?.value ?? "30";
  const staff = await db
    .select({ id: user.id, name: staffProfiles.displayName })
    .from(staffProfiles)
    .innerJoin(user, eq(user.id, staffProfiles.userId))
    .where(eq(staffProfiles.active, true));
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Book a consultation</h1>
      <p className="text-sm text-muted">
        Fee ₦{fee.toLocaleString("en-NG")} · about {duration} minutes, in person or by video — shown before you pay.
        The fee credits once against your beauty appointment.
      </p>
      <ConsultationBook services={svcRows.filter((s) => s.active)} staff={staff} />
    </div>
  );
}
