import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { lookImages, looks } from "@/db/schema";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db
    .select()
    .from(looks)
    .where(and(eq(looks.id, params.id), eq(looks.userId, session.user.id)));
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const src = rows[0];
  const id = randomUUID();
  const now = new Date();
  await db.insert(looks).values({
    id,
    userId: session.user.id,
    name: `${src.name} (copy)`,
    occasion: src.occasion,
    makeupPreferences: src.makeupPreferences,
    hairstyle: src.hairstyle,
    hairLengthTexture: src.hairLengthTexture,
    finish: src.finish,
    avoidDetails: src.avoidDetails,
    sensitivities: src.sensitivities,
    productPreferences: src.productPreferences,
    status: "draft",
    createdAt: now,
    updatedAt: now
  });
  const images = await db.select().from(lookImages).where(eq(lookImages.lookId, src.id));
  for (const img of images) {
    await db.insert(lookImages).values({
      id: randomUUID(),
      lookId: id,
      url: img.url,
      source: img.source,
      galleryItemId: img.galleryItemId
    });
  }
  return NextResponse.json({ id }, { status: 201 });
}
