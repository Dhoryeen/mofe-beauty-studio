import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveFinalLook } from "@/lib/changes";

// POST /api/bookings/[id]/final-look { note?, publishConsent? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await saveFinalLook(session.user.id, params.id, { note: body.note, publishConsent: body.publishConsent }), { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
