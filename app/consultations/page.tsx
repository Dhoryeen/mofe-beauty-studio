import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consultations, services } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const rows = await db
    .select()
    .from(consultations)
    .where(eq(consultations.userId, session.user.id))
    .orderBy(desc(consultations.createdAt));

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Consultations</h1>
          <p className="text-sm text-muted">
            Required for bridal and complex looks, optional otherwise. <a href="/consultations/info" className="underline">How they work</a>
          </p>
        </div>
        <a href="/consultations/new" className="rounded-md bg-ink px-4 py-2 text-sm text-cream">Book consultation</a>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No consultations yet.</p>
      ) : (
        <div className="grid gap-3">
          {await Promise.all(
            rows.map(async (c) => {
              const svc = (await db.select().from(services).where(eq(services.id, c.serviceId)))[0];
              return (
                <a key={c.id} href={`/consultations/${c.id}`} className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{svc?.name ?? "Consultation"} · {c.mode === "video" ? "Video" : "In person"}</p>
                    <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{c.status}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {c.slotStart ? new Date(c.slotStart).toLocaleString() : "Unscheduled"} · ₦{(c.feeNaira).toLocaleString("en-NG")}
                  </p>
                </a>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
