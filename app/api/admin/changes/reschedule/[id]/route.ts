import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { decideRefund, decideReschedule } from "@/lib/changes";

// POST /api/admin/changes/reschedule/[id] { approve, note? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });
  try {
    const body = await req.json();
    return NextResponse.json(await decideReschedule(session.user.id, params.id, body.approve === true, body.note));
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
