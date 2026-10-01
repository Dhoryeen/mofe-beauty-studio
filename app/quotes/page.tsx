import { desc, eq, ne, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quotes, services } from "@/db/schema";
import { effectiveStatus } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const role = (session.user as { role?: string } | undefined)?.role;
  const rows =
    role === "manager"
      ? await db.select().from(quotes).orderBy(desc(quotes.createdAt))
      : role === "beautician_consultant"
        ? await db.select().from(quotes).where(eq(quotes.createdBy, session.user.id)).orderBy(desc(quotes.createdAt))
        : await db
            .select()
            .from(quotes)
            .where(and(eq(quotes.userId, session.user.id), ne(quotes.status, "draft")))
            .orderBy(desc(quotes.createdAt));

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Look summaries + quotes</h1>
        <p className="text-sm text-muted">Review and approve your agreed look and price. Approval is required before preparation begins.</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No quotes yet — the studio sends one after your consultation or request.</p>
      ) : (
        <div className="grid gap-3">
          {await Promise.all(
            rows.map(async (q) => {
              const svc = (await db.select().from(services).where(eq(services.id, q.serviceId)))[0];
              const st = effectiveStatus(q);
              return (
                <a key={q.id} href={`/quotes/${q.id}`} className="grid gap-1 rounded-lg bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{svc?.name ?? "Quote"} · v{q.version}</p>
                    <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{st}</span>
                  </div>
                  <p className="text-xs text-muted">
                    Total ₦{q.totalNaira.toLocaleString("en-NG")}
                    {q.validUntil && st === "awaiting_approval" ? ` · expires ${new Date(q.validUntil).toLocaleDateString()}` : ""}
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
