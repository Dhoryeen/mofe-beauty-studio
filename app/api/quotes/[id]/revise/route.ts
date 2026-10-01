import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quotes } from "@/db/schema";
import { reviseQuote } from "@/lib/quotes";

// POST /api/quotes/[id]/revise — studio only; creates a new version (history retained).
// Managers may also { send: true } a draft (beautician proposals need manager review).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "manager" && role !== "beautician_consultant")) {
    return NextResponse.json({ error: "Studio only" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const rows = await db.select().from(quotes).where(eq(quotes.id, params.id));
    const q = rows[0];
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role !== "manager" && q.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Only the proposing beautician or a manager" }, { status: 403 });
    }
    if (body.send === true && role !== "manager") {
      return NextResponse.json({ error: "Only managers send quotes" }, { status: 403 });
    }
    const result = await reviseQuote(
      q.id,
      {
        makeup: body.makeup,
        hairstyle: body.hairstyle,
        referencePhotos: body.referencePhotos,
        extras: body.extras,
        prepRequirements: body.prepRequirements,
        travelNaira: body.travelNaira !== undefined ? Number(body.travelNaira) : undefined,
        depositNaira: body.depositNaira !== undefined ? Number(body.depositNaira) : undefined,
        note: body.note
      },
      session.user.id,
      role === "manager" ? body.send !== false : false
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
