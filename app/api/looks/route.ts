import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { lookImages, looks } from "@/db/schema";

type ImageInput = { url: string; source?: string; galleryItemId?: string | null };

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db
    .select()
    .from(looks)
    .where(eq(looks.userId, session.user.id))
    .orderBy(desc(looks.updatedAt));
  const withImages = await Promise.all(
    rows.map(async (l) => ({
      ...l,
      images: await db.select().from(lookImages).where(eq(lookImages.lookId, l.id))
    }))
  );
  return NextResponse.json({ looks: withImages });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  if (!body?.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const id = randomUUID();
  const now = new Date();
  await db.insert(looks).values({
    id,
    userId: session.user.id,
    name: body.name.trim(),
    occasion: body.occasion ?? "everyday",
    makeupPreferences: body.makeupPreferences ?? "",
    hairstyle: body.hairstyle ?? "",
    hairLengthTexture: body.hairLengthTexture ?? "",
    finish: body.finish ?? "",
    avoidDetails: body.avoidDetails ?? "",
    sensitivities: body.sensitivities ?? "",
    productPreferences: body.productPreferences ?? "",
    status: "draft",
    createdAt: now,
    updatedAt: now
  });
  const images: ImageInput[] = Array.isArray(body.images) ? body.images : [];
  for (const img of images.filter((i) => i?.url)) {
    await db.insert(lookImages).values({
      id: randomUUID(),
      lookId: id,
      url: img.url,
      source: img.source === "gallery" ? "gallery" : "upload",
      galleryItemId: img.galleryItemId ?? null
    });
  }
  return NextResponse.json({ id }, { status: 201 });
}
