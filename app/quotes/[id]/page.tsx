import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quoteApprovals, quotes, services, trials, user } from "@/db/schema";
import { effectiveStatus, quoteHistory } from "@/lib/quotes";
import { QuoteTable } from "@/components/design-system/QuoteTable";
import { ApprovalBanner } from "@/components/design-system/ApprovalBanner";
import { DecideButtons, TrialBook, TrialFeedback } from "@/components/ConsultQuote";
import { QuoteRevise } from "@/components/QuoteAdmin";
import { staffForService } from "@/lib/slots";

export const dynamic = "force-dynamic";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const rows = await db.select().from(quotes).where(eq(quotes.id, params.id));
  const q = rows[0];
  const role = (session.user as { role?: string } | undefined)?.role;
  const allowed =
    q && (q.userId === session.user.id || role === "manager" || (role === "beautician_consultant" && q.createdBy === session.user.id));
  if (!allowed) redirect("/quotes");

  const st = effectiveStatus(q);
  const history = await quoteHistory(q.id);
  const approvals = await db.select().from(quoteApprovals).where(eq(quoteApprovals.quoteId, q.id));
  const trialRows = await db.select().from(trials).where(eq(trials.quoteId, q.id));
  const svc = (await db.select().from(services).where(eq(services.id, q.serviceId)))[0];
  const isOwner = q.userId === session.user.id;
  const isStudio = role === "manager" || (role === "beautician_consultant" && q.createdBy === session.user.id);
  const staff = await staffForService(svc?.category ?? "makeup");

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{svc?.name ?? "Quote"} · v{q.version}</h1>
        <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{st}</span>
      </div>

      <div className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
        <h2 className="font-semibold">Agreed look</h2>
        {q.makeup && <p><strong>Makeup:</strong> {q.makeup}</p>}
        {q.hairstyle && <p><strong>Hair:</strong> {q.hairstyle}</p>}
        {q.extras.length > 0 && <p><strong>Extras:</strong> {q.extras.join(", ")}</p>}
        {q.prepRequirements && <p><strong>Preparation:</strong> {q.prepRequirements}</p>}
        {q.referencePhotos.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {q.referencePhotos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-28 w-full rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>

      <QuoteTable
        lines={[
          { label: "Service charges", amount: naira(q.serviceNaira) },
          { label: "Travel", amount: naira(q.travelNaira) },
          { label: "Deposit due to confirm", amount: naira(q.depositNaira) }
        ]}
        total={naira(q.totalNaira)}
      />
      <p className="text-xs text-muted">
        {q.validUntil ? `Valid until ${new Date(q.validUntil).toLocaleString()}. ` : ""}An expired quote needs studio review before payment.
      </p>

      {st === "awaiting_approval" && isOwner && <DecideButtons id={q.id} />}
      {st === "expired" && isOwner && <ApprovalBanner state="expired" />}
      {st === "approved" && <ApprovalBanner state="approved" />}

      {approvals.length > 0 && (
        <div className="grid gap-1 text-sm">
          <h2 className="font-semibold">Decisions</h2>
          {approvals.map((a) => (
            <p key={a.id} className="text-muted">{a.decision} · {new Date(a.createdAt).toLocaleString()}{a.note ? ` · ${a.note}` : ""}</p>
          ))}
        </div>
      )}

      {history.length > 1 && (
        <div className="grid gap-1 text-sm">
          <h2 className="font-semibold">Version history (prior agreements retained)</h2>
          {history.map((h) => (
            <p key={h.id} className="text-muted">
              <a href={`/quotes/${h.id}`} className="underline">v{h.version}</a> · {effectiveStatus(h)} · total {naira(h.totalNaira)} · {new Date(h.createdAt).toLocaleString()}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-3 rounded-lg bg-card p-4 shadow-card">
        <h2 className="font-semibold">Paid trial</h2>
        {trialRows.length === 0 && isOwner && st !== "draft" && <TrialBook quoteId={q.id} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />}
        {trialRows.map((t) => (
          <div key={t.id} className="grid gap-2 border-t border-black/5 pt-2 text-sm">
            <p>{t.slotStart ? new Date(t.slotStart).toLocaleString() : ""} · {naira(t.feeNaira)} · {t.status}</p>
            {t.feedback ? <p><strong>Feedback:</strong> {t.feedback}</p> : (!isOwner && t.status === "booked" && <TrialFeedback id={t.id} />)}
          </div>
        ))}
      </div>

      {isStudio && ["draft", "awaiting_approval", "expired", "rejected"].includes(st) && (
        <QuoteRevise
          id={q.id}
          initial={{ makeup: q.makeup, hairstyle: q.hairstyle, prepRequirements: q.prepRequirements, travelNaira: q.travelNaira }}
          isManager={role === "manager"}
        />
      )}

      <p><a href="/quotes" className="text-sm underline">← Quotes</a></p>
    </div>
  );
}
