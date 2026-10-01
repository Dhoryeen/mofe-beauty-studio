import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { consultations, payments } from "@/db/schema";
import { applyConsultationPayment } from "@/lib/consultations";
import { initializePayment, providerName } from "@/lib/payments";
import { markPaymentFailed } from "@/lib/payments/reconcile";

// POST /api/consultations/[id]/pay — retry a failed consultation payment.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db.select().from(consultations).where(eq(consultations.id, params.id));
  const c = rows[0];
  if (!c || c.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (c.status !== "pending_payment") return NextResponse.json({ error: "Nothing owed" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const paymentId = randomUUID();
  const now = new Date();
  const init = await initializePayment({
    email: session.user.email,
    amountNaira: c.feeNaira,
    simulate: process.env.PAYSTACK_SECRET_KEY ? undefined : body.simulate
  });
  await db.insert(payments).values({
    id: paymentId,
    bookingId: null,
    consultationId: c.id,
    trialId: null,
    provider: providerName(),
    reference: init.reference,
    amountNaira: c.feeNaira,
    kind: "consultation",
    status: "pending",
    raw: null,
    createdAt: now,
    updatedAt: now
  });
  if (init.immediate === "success") await applyConsultationPayment(paymentId);
  else if (init.immediate === "failed") await markPaymentFailed(paymentId);
  return NextResponse.json({ reference: init.reference, authorizationUrl: init.authorizationUrl }, { status: 201 });
}
