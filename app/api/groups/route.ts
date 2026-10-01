import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createGroup, myGroups } from "@/lib/groups";

function err(e: unknown) {
  const status = (e as { status?: number })?.status ?? 500;
  return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ groups: await myGroups(session.user.id) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await createGroup(session.user.id, {
      name: body.name,
      eventDate: body.eventDate ?? undefined,
      location: body.location ?? undefined,
      readinessDeadline: body.readinessDeadline ?? undefined,
      sizeInt: body.sizeInt !== undefined ? Number(body.sizeInt) : 1,
      payMode: body.payMode,
      note: body.note ?? undefined
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return err(e);
  }
}
