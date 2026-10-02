import { createHmac, randomUUID } from "crypto";

const BASE = "https://api.paystack.co";

function secret() {
  const s = process.env.PAYSTACK_SECRET_KEY;
  if (!s) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return s;
}

export async function paystackInitialize(opts: { email: string; amountNaira: number }) {
  const reference = `mofe_${randomUUID().replace(/-/g, "")}`;
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountNaira * 100, // kobo
      reference,
      callback_url: `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/book/callback`
    })
  });
  const data = await res.json();
  if (!data?.status) {
    // Surface provider validation (e.g. bad email) as a client error, not a 500.
    throw Object.assign(new Error(data?.message ?? "Paystack initialize failed"), { status: 400 });
  }
  return { reference, authorizationUrl: data.data.authorization_url as string, immediate: null };
}

export async function paystackVerify(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret()}` }
  });
  const data = await res.json();
  const ok = data?.status === true && data?.data?.status === "success";
  return { reference, status: ok ? ("success" as const) : ("failed" as const), raw: data };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  try {
    const hash = createHmac("sha512", secret()).update(rawBody).digest("hex");
    return hash === signature;
  } catch {
    return false;
  }
}
