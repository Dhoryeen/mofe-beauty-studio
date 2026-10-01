import { mockInitialize, mockVerify } from "./mock";
import { paystackInitialize, paystackVerify } from "./paystack";

export type InitResult = { reference: string; authorizationUrl: string | null; immediate: "success" | "failed" | null };

export function providerName(): "paystack" | "mock" {
  return process.env.PAYSTACK_SECRET_KEY ? "paystack" : "mock";
}

export async function initializePayment(opts: {
  email: string;
  amountNaira: number;
  simulate?: string;
}): Promise<InitResult> {
  if (providerName() === "paystack") return paystackInitialize(opts);
  return mockInitialize(opts);
}

export async function verifyPayment(reference: string) {
  if (reference.startsWith("mock_")) return mockVerify(reference);
  return paystackVerify(reference);
}
