import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@/db/schema";
import { applyPaymentSuccess } from "@/lib/payments/reconcile";
import { verifyWebhookSignature } from "@/lib/payments/paystack";

// POST /api/paystack/webhook — Paystack charge events, HMAC-verified.
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  try {
    const event = JSON.parse(raw);
    if (event?.event === "charge.success") {
      const reference = event?.data?.reference as string | undefined;
      if (reference) {
        const rows = await db.select().from(payments).where(eq(payments.reference, reference));
        if (rows[0]) {
          await db
            .update(payments)
            .set({ raw: event?.data ?? null, updatedAt: new Date() })
            .where(eq(payments.id, rows[0].id));
          await applyPaymentSuccess(rows[0].id);
        }
      }
    }
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  return NextResponse.json({ received: true });
}
