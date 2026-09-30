import { db } from "@/lib/db";
import { services } from "@/db/schema";
import { PriceBlock } from "@/components/design-system/PriceBlock";

export const dynamic = "force-dynamic";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default async function ServicesPage() {
  const rows = await db.select().from(services);
  const live = rows.filter((s) => s.active);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="text-sm text-muted">
          Live from the local PostgreSQL catalogue{live.length ? "" : " — empty, run the seed"}.
        </p>
      </div>
      {live.length === 0 && (
        <p className="text-sm">
          No services yet. Run <code>npm run db:seed</code> with the local database started.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {live.map((s) => (
          <PriceBlock
            key={s.id}
            name={s.name}
            duration={s.duration}
            price={naira(s.priceNaira)}
            starting={s.priceType === "starting"}
            extras={[
              `Available: ${s.availableAt}`,
              s.consultRequired ? "Consultation required" : "Consultation optional",
              ...s.extras
            ]}
          />
        ))}
      </div>
    </div>
  );
}
