import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quoteApprovals, quotes, services, trials, user } from "@/db/schema";
import { effectiveStatus, quoteHistory } from "@/lib/quotes";

function roleOf(session: { user: unknown }) {
  return (session.user as { role?: string } | undefined)?.role;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = roleOf(session);
  const rows = await db.select().from(quotes).where(eq(quotes.id, params.id));
  const q = rows[0];
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed =
    q.userId === session.user.id ||
    role === "manager" ||
    (role === "beautician_consultant" && q.createdBy === session.user.id);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = await quoteHistory(q.id);
  const approvals = await db.select().from(quoteApprovals).where(eq(quoteApprovals.quoteId, q.id));
  const trialRows = await db.select().from(trials).where(eq(trials.quoteId, q.id));
  const svc = (await db.select().from(services).where(eq(services.id, q.serviceId)))[0];
  const client = (await db.select().from(user).where(eq(user.id, q.userId)))[0];
  return NextResponse.json({
    quote: { ...q, status: effectiveStatus(q) },
    history: history.map((h) => ({ ...h, status: effectiveStatus(h) })),
    approvals,
    trials: trialRows,
    serviceName: svc?.name ?? "",
    clientEmail: client?.email ?? ""
  });
}
