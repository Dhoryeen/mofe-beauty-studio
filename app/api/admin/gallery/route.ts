import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { galleryItems } from "@/db/schema";

const SERVICES = ["makeup", "hair", "combined"];
const OCCASIONS = ["bridal", "birthday", "everyday", "other"];

async function manager() {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) return { error: "Sign in required", status: 401 } as const;
  if (role !== "manager") return { error: "Managers only", status: 403 } as const;
  return null;
}

export async function GET() {
  const denied = await manager();
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  const rows = await db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const denied = await manager();
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  const body = await req.json();
  if (!body?.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!SERVICES.includes(body.service)) return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  if (!OCCASIONS.includes(body.occasion)) return NextResponse.json({ error: "Invalid occasion" }, { status: 400 });

  const id = randomUUID();
  await db.insert(galleryItems).values({
    id,
    title: body.title.trim(),
    service: body.service,
    occasion: body.occasion,
    finish: body.finish || null,
    hairLength: body.hairLength || null,
    imageUrl: body.imageUrl || null,
    active: body.active ?? true,
    sortOrder: Number(body.sortOrder) || 0
  });
  return NextResponse.json({ id }, { status: 201 });
}
