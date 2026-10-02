import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { galleryItems } from "@/db/schema";

export const dynamic = "force-dynamic";

const FILTERS = {
  service: ["makeup", "hair", "combined"],
  occasion: ["bridal", "birthday", "everyday", "other"],
  finish: ["natural", "soft-glam", "full-glam", "matte"],
  hair: ["short", "medium", "long", "extensions"]
} as const;

function link(params: Record<string, string | undefined>, key: string, value: string | undefined) {
  const next = { ...params };
  if (value === undefined) delete next[key];
  else next[key] = value;
  const q = new URLSearchParams(next as Record<string, string>).toString();
  return q ? `/gallery?${q}` : "/gallery";
}

export default async function GalleryPage({
  searchParams
}: {
  searchParams: { service?: string; occasion?: string; finish?: string; hair?: string };
}) {
  const conds = [eq(galleryItems.active, true)];
  if (searchParams.service) conds.push(eq(galleryItems.service, searchParams.service));
  if (searchParams.occasion) conds.push(eq(galleryItems.occasion, searchParams.occasion));
  if (searchParams.finish) conds.push(eq(galleryItems.finish, searchParams.finish));
  if (searchParams.hair) conds.push(eq(galleryItems.hairLength, searchParams.hair));
  const items = await db
    .select()
    .from(galleryItems)
    .where(and(...conds))
    .orderBy(asc(galleryItems.sortOrder));
  const { resolveUrl } = await import("@/lib/storage");
  const shown = await Promise.all(
    items.map(async (g) => ({ ...g, displayUrl: await resolveUrl(g.imageUrl) }))
  );
  const active = {
    service: searchParams.service,
    occasion: searchParams.occasion,
    finish: searchParams.finish,
    hair: searchParams.hair
  };

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Gallery</h1>
        <p className="text-sm text-muted">
          Inspiration guides discussion and does not guarantee an identical result.
        </p>
      </div>

      {(Object.keys(FILTERS) as Array<keyof typeof FILTERS>).map((key) => {
        const param = key === "hair" ? "hair" : key;
        return (
          <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-20 font-medium capitalize">{key}</span>
            <a
              href={link(active, param, undefined)}
              className={`rounded-full px-3 py-1 ${active[param as keyof typeof active] ? "bg-black/10" : "bg-ink text-cream"}`}
            >
              All
            </a>
            {FILTERS[key].map((v) => (
              <a
                key={v}
                href={link(active, param, v)}
                className={`rounded-full px-3 py-1 ${active[param as keyof typeof active] === v ? "bg-ink text-cream" : "bg-black/10"}`}
              >
                {v}
              </a>
            ))}
          </div>
        );
      })}

      {items.length === 0 ? (
        <p className="text-sm text-muted">
          No looks match these filters. Run <code>npm run db:seed</code> if the gallery is empty.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {shown.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-lg bg-card shadow-card">
              {g.displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.displayUrl} alt={g.title} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center bg-blush text-sm text-muted">
                  Photo placeholder
                </div>
              )}
              <div className="grid gap-1 p-3">
                <p className="text-sm font-semibold">{g.title}</p>
                <p className="text-xs text-muted">
                  {g.service} · {g.occasion}
                  {g.finish ? ` · ${g.finish}` : ""}
                  {g.hairLength ? ` · ${g.hairLength} hair` : ""}
                </p>
                <a href={`/looks/new?gallery=${g.id}`} className="text-xs font-medium underline">
                  Use as starting point
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
