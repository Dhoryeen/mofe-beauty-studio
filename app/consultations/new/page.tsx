import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { services, staffProfiles, user } from "@/db/schema";
import { ConsultationBook } from "@/components/ConsultQuote";

export const dynamic = "force-dynamic";

export default async function NewConsultationPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const svcRows = await db.select().from(services);
  const staff = await db
    .select({ id: user.id, name: staffProfiles.displayName })
    .from(staffProfiles)
    .innerJoin(user, eq(user.id, staffProfiles.userId))
    .where(eq(staffProfiles.active, true));
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Book a consultation</h1>
      <ConsultationBook services={svcRows.filter((s) => s.active)} staff={staff} />
    </div>
  );
}
