import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { quotes, user } from "@/db/schema";
import { createQuote } from "@/lib/quotes";

function roleOf(session: { user: unknown }) {
  return (session.user as { role?: string } | undefined)?.role;
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const role = roleOf(session);
  let rows;
  if (role === "manager") {
    rows = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  } else if (role === "beautician_consultant") {
    rows = await db
      .select()
      .from(quotes)
      .where(eq(quotes.createdBy, session.user.id))
      .orderBy(desc(quotes.createdAt));
  } else {
    rows = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.userId, session.user.id), ne(quotes.status, "draft")))
      .orderBy(desc(quotes.createdAt));
  }
  return NextResponse.json({ quotes: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Studio only" }, { status: 403 });
  const role = roleOf(session);
  if (role !== "manager" && role !== "beautician_consultant") {
    return NextResponse.json({ error: "Studio only" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const client = (await db.select().from(user).where(eq(user.email, String(body.clientEmail ?? "").trim().toLowerCase())))[0];
    if (!client) return NextResponse.json({ error: "Unknown client email" }, { status: 400 });
    // Beauticians propose drafts for manager review; only managers send.
    const send = role === "manager" && body.send === true;
    const result = await createQuote({
      userId: client.id,
      serviceId: body.serviceId,
      lookId: body.lookId ?? undefined,
      bookingId: body.bookingId ?? undefined,
      makeup: body.makeup ?? "",
      hairstyle: body.hairstyle ?? "",
      referencePhotos: body.referencePhotos ?? [],
      extras: body.extras ?? [],
      prepRequirements: body.prepRequirements ?? "",
      travelNaira: Number(body.travelNaira) || 0,
      depositNaira: body.depositNaira !== undefined ? Number(body.depositNaira) : undefined,
      note: body.note ?? "",
      createdBy: session.user.id,
      send
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
