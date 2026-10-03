import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { galleryItems, services } from "@/db/schema";
import { resolveUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

const STEPS = [
  { n: "1", title: "Create your look", text: "Start from the gallery or upload your own inspiration, then shape it with guided preferences." },
  { n: "2", title: "Approve the plan", text: "Review your look summary and personalised quote. Nothing starts until you approve." },
  { n: "3", title: "Book and pay", text: "Pick your specialist and time, pay a deposit or in full, and follow preparation milestones." },
  { n: "4", title: "Glow", text: "Attend, settle any balance, get aftercare — then save the look to rebook anytime." }
];

export default async function Home() {
  const gallery = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.active, true))
    .orderBy(asc(galleryItems.sortOrder));
  const featured = await Promise.all(
    gallery.slice(0, 6).map(async (g) => ({ ...g, displayUrl: await resolveUrl(g.imageUrl) }))
  );
  const svcRows = (await db.select().from(services)).filter((s) => s.active).slice(0, 3);

  return (
    <div className="grid gap-12">
      <section className="grid gap-5">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">Look → approve → book → glow</h1>
        <p className="max-w-2xl text-muted">
          Mofe Beauty Studio turns your makeup and hairstyling ideas into a bookable plan — designed
          with you, approved by you, and followed through to the chair.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/book" className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream shadow-card">
            Book a service
          </a>
          <a href="/gallery" className="rounded-full border border-ink/20 bg-card px-6 py-3 text-sm font-medium shadow-card">
            Browse the gallery
          </a>
        </div>
        <p className="text-xs text-muted">
          Bridal, complex and off-site looks start with a consultation and studio confirmation — <a href="/consultations/info" className="underline">how it works</a>.
        </p>
      </section>

      <section className="grid gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Featured looks</h2>
          <a href="/gallery" className="text-sm underline">View all</a>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {featured.map((g) => (
            <a key={g.id} href={`/looks/new?gallery=${g.id}`} className="overflow-hidden rounded-lg bg-card shadow-card">
              {g.displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.displayUrl} alt={g.title} className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-blush text-sm text-muted">Photo placeholder</div>
              )}
              <div className="grid gap-0.5 p-3">
                <p className="text-sm font-semibold">{g.title}</p>
                <p className="text-xs text-muted">{g.service} · {g.occasion}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="text-xs text-muted">Inspiration photos guide discussion and do not guarantee an identical result.</p>
      </section>

      <section className="grid gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Services</h2>
          <a href="/services" className="text-sm underline">All services</a>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {svcRows.map((s) => (
            <a key={s.id} href="/services" className="rounded-lg bg-card p-4 shadow-card">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-muted">{s.duration}</p>
              <p className="mt-1 text-sm font-medium">
                {naira(s.priceNaira)}{s.priceType === "starting" ? " · starting price" : ""}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-lg bg-card p-4 shadow-card">
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-white">{s.n}</p>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
