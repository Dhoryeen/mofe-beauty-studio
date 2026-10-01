import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { galleryItems } from "@/db/schema";

const SERVICES = ["makeup", "hair", "combined"];
const OCCASIONS = ["bridal", "birthday", "everyday", "other"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (role !== "manager") return NextResponse.json({ error: "Managers only" }, { status: 403 });

  const body = await req.json();
  if (body.service !== undefined && !SERVICES.includes(body.service)) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  }
  if (body.occasion !== undefined && !OCCASIONS.includes(body.occasion)) {
    return NextResponse.json({ error: "Invalid occasion" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "service", "occasion", "finish", "hairLength", "imageUrl", "active", "sortOrder"]) {
    if (body[k] !== undefined) patch[k] = body[k] === "" ? null : body[k];
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await db.update(galleryItems).set(patch).where(eq(galleryItems.id, params.id));
  return NextResponse.json({ ok: true });
}
