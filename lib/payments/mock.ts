import { randomUUID } from "crypto";

// Dev/test provider. No real money moves. `simulate: "failed"` exercises the
// failed-payment path (honoured only by the mock provider).
export async function mockInitialize(opts: { amountNaira: number; simulate?: string }) {
  void opts.amountNaira;
  const reference = `mock_${randomUUID().replace(/-/g, "")}`;
  const failed = opts.simulate === "failed";
  return { reference, authorizationUrl: null as string | null, immediate: (failed ? "failed" : "success") as "failed" | "success" };
}

export async function mockVerify(reference: string) {
  return { reference, status: "success" as const };
}
