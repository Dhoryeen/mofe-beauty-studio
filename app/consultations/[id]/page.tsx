import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consultationCredits, consultations, payments, services, user } from "@/db/schema";
import { CancelButton, ConsultationPay, OutcomeForm } from "@/components/ConsultQuote";
import { PaymentStatus } from "@/components/design-system/PaymentStatus";

export const dynamic = "force-dynamic";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default async function ConsultationDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const rows = await db.select().from(consultations).where(eq(consultations.id, params.id));
  const c = rows[0];
  const role = (session.user as { role?: string } | undefined)?.role;
  const canView =
    c && (c.userId === session.user.id || role === "manager" || (role === "beautician_consultant" && (!c.staffId || c.staffId === session.user.id)));
  if (!canView) redirect("/consultations");

  const svc = (await db.select().from(services).where(eq(services.id, c.serviceId)))[0];
  const pays = await db.select().from(payments).where(eq(payments.consultationId, c.id));
  const paid = pays.some((p) => p.status === "success");
  const credit = (await db.select().from(consultationCredits).where(eq(consultationCredits.consultationId, c.id)))[0];
  const staffName = c.staffId ? (await db.select().from(user).where(eq(user.id, c.staffId)))[0]?.name : null;
  const isStaff = role === "manager" || (role === "beautician_consultant" && (!c.staffId || c.staffId === session.user.id));
  const isOwner = c.userId === session.user.id;

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{svc?.name ?? "Consultation"}</h1>
        <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{c.status}</span>
      </div>
      <div className="rounded-lg bg-card p-4 text-sm shadow-card">
        <p><strong>{c.slotStart ? new Date(c.slotStart).toLocaleString() : "Unscheduled"}</strong> · {c.mode === "video" ? "Video" : "In person"}{staffName ? ` · with ${staffName}` : ""}</p>
        <p className="text-muted">Fee {naira(c.feeNaira)} · {paid ? "paid" : "unpaid"}</p>
        {c.status === "pending_payment" && isOwner && <div className="mt-3"><ConsultationPay id={c.id} /></div>}
      </div>

      {(c.recommendations || c.openQuestions || c.nextSteps) && (
        <div className="grid gap-2 rounded-lg bg-card p-4 text-sm shadow-card">
          <h2 className="font-semibold">Outcome</h2>
          {c.recommendations && <p><strong>Recommendations:</strong> {c.recommendations}</p>}
          {c.openQuestions && <p><strong>Open questions:</strong> {c.openQuestions}</p>}
          {c.nextSteps && <p><strong>Next steps:</strong> {c.nextSteps}</p>}
        </div>
      )}

      {credit && (
        <div className="flex items-center gap-2 text-sm">
          <span>Consultation credit:</span>
          <PaymentStatus status={`${naira(credit.amountNaira)} · ${credit.status}`} />
        </div>
      )}
      {c.status === "completed" && !credit && <p className="text-sm text-muted">Completed before credit was issued.</p>}

      {isStaff && c.status === "booked" && <OutcomeForm id={c.id} />}

      <div className="flex gap-2">
        {isOwner && ["pending_payment", "booked"].includes(c.status) && <CancelButton id={c.id} label="Cancel consultation" />}
        <a href="/consultations" className="text-sm underline">← Consultations</a>
      </div>
      <p className="text-xs text-muted">A consultation booking never confirms the beauty appointment itself.</p>
    </div>
  );
}
