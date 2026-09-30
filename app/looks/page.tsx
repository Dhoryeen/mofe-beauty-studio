import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { lookImages, looks } from "@/db/schema";
import { LookActions } from "@/components/LookActions";

export const dynamic = "force-dynamic";

export default async function LooksPage() {
  const session = await getSession();
  if (!session?.user) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold">My looks</h1>
        <p className="text-sm">
          <a href="/sign-in" className="underline">Sign in</a> or{" "}
          <a href="/sign-up" className="underline">create an account</a> to save looks.
        </p>
      </div>
    );
  }

  const rows = await db
    .select()
    .from(looks)
    .where(eq(looks.userId, session.user.id))
    .orderBy(desc(looks.updatedAt));

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My looks</h1>
          <p className="text-sm text-muted">Named inspiration boards — edit, duplicate, archive.</p>
        </div>
        <a href="/looks/new" className="rounded-md bg-ink px-4 py-2 text-sm text-cream">
          New look
        </a>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No looks yet. Start from the <a href="/gallery" className="underline">gallery</a> or create
          one from scratch.
        </p>
      ) : (
        <div className="grid gap-3">
          {await Promise.all(
            rows.map(async (l) => {
              const images = await db.select().from(lookImages).where(eq(lookImages.lookId, l.id));
              return (
                <div key={l.id} className="grid gap-2 rounded-lg bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{l.name}</p>
                    <span className="rounded-full bg-black/10 px-3 py-1 text-xs">{l.status}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {l.occasion} · {images.length} image{images.length === 1 ? "" : "s"} · updated{" "}
                    {new Date(l.updatedAt).toLocaleDateString()}
                  </p>
                  <LookActions id={l.id} status={l.status} />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
