import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { galleryItems, lookImages, looks } from "@/db/schema";
import { LookForm } from "@/components/LookForm";

export const dynamic = "force-dynamic";

export default async function LookDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const rows = await db
    .select()
    .from(looks)
    .where(and(eq(looks.id, params.id), eq(looks.userId, session.user.id)));
  if (rows.length === 0) redirect("/looks");
  const look = rows[0];
  const images = await db.select().from(lookImages).where(eq(lookImages.lookId, look.id));
  const { resolveUrl } = await import("@/lib/storage");
  const shown = await Promise.all(
    images.map(async (img) => ({ ...img, displayUrl: img.source === "gallery" ? null : await resolveUrl(img.url) }))
  );
  const gallery = await db
    .select({ id: galleryItems.id, title: galleryItems.title })
    .from(galleryItems)
    .where(eq(galleryItems.active, true))
    .orderBy(asc(galleryItems.sortOrder));

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{look.name}</h1>
        <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{look.status}</span>
      </div>
      {images.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {shown.map((img) =>
            img.source === "gallery" || !img.displayUrl ? (
              <div key={img.id} className="flex h-28 items-center justify-center rounded-lg bg-blush text-xs text-muted">
                Gallery pick
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.displayUrl} alt="" className="h-28 w-full rounded-lg object-cover" />
            )
          )}
        </div>
      )}
      <LookForm
        lookId={look.id}
        initial={{
          name: look.name,
          occasion: look.occasion,
          makeupPreferences: look.makeupPreferences,
          hairstyle: look.hairstyle,
          hairLengthTexture: look.hairLengthTexture,
          finish: look.finish,
          avoidDetails: look.avoidDetails,
          sensitivities: look.sensitivities,
          productPreferences: look.productPreferences
        }}
        gallery={gallery}
      />
      <p>
        <a href="/looks" className="text-sm underline">← Back to my looks</a>
      </p>
    </div>
  );
}
