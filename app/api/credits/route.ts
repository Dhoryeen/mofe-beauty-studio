import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findCredit } from "@/lib/consultations";

// GET /api/credits?serviceId=…&lookId=… — preview of the usable consultation credit.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("serviceId") ?? "";
  const lookId = url.searchParams.get("lookId") ?? undefined;
  if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });
  const credit = await findCredit(session.user.id, serviceId, lookId);
  return NextResponse.json({ amountNaira: credit?.amountNaira ?? 0 });
}
