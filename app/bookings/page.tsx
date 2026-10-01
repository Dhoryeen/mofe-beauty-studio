import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { bookings, services } from "@/db/schema";
import { PaymentStatus } from "@/components/design-system/PaymentStatus";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, session.user.id))
    .orderBy(desc(bookings.createdAt));

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My bookings</h1>
        <a href="/book" className="rounded-md bg-ink px-4 py-2 text-sm text-cream">Book a service</a>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No bookings yet.</p>
      ) : (
        <div className="grid gap-3">
          {await Promise.all(
            rows.map(async (b) => {
              const svc = (await db.select().from(services).where(eq(services.id, b.serviceId)))[0];
              return (
                <a key={b.id} href={`/bookings/${b.id}`} className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{svc?.name ?? "Service"}</p>
                    <PaymentStatus status={b.paymentStatus} />
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(b.slotStart).toLocaleString()} · {b.status}
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
