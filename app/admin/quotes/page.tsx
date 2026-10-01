import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quotes, services } from "@/db/schema";
import { QuoteCreate } from "@/components/QuoteAdmin";
import { effectiveStatus } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "manager" && role !== "beautician_consultant")) redirect("/sign-in");

  const svcRows = await db.select().from(services);
  const rows =
    role === "manager"
      ? await db.select().from(quotes).orderBy(desc(quotes.createdAt))
      : await db.select().from(quotes).where(eq(quotes.createdBy, session.user.id)).orderBy(desc(quotes.createdAt));

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold">Quotes (studio)</h1>
      <QuoteCreate services={svcRows.filter((s) => s.active)} isManager={role === "manager"} />
      <div className="grid gap-2">
        {rows.map((q) => (
          <a key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between rounded-lg bg-card p-3 text-sm shadow-card">
            <span>v{q.version} · {q.userId.slice(0, 8)}… · ₦{q.totalNaira.toLocaleString("en-NG")}</span>
            <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{effectiveStatus(q)}</span>
          </a>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No quotes yet.</p>}
      </div>
    </div>
  );
}
