import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { services, staffProfiles, user } from "@/db/schema";
import { BookFlow } from "@/components/BookFlow";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const svcRows = await db.select().from(services);
  const profRows = await db
    .select({ id: user.id, name: staffProfiles.displayName, craft: staffProfiles.craft, bio: staffProfiles.bio })
    .from(staffProfiles)
    .innerJoin(user, eq(user.id, staffProfiles.userId))
    .where(eq(staffProfiles.active, true));

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Book a service</h1>
        <p className="text-sm text-muted">Instant booking for standard services — every slot is capacity-checked.</p>
      </div>
      <BookFlow services={svcRows.filter((s) => s.active)} staff={profRows} />
    </div>
  );
}
