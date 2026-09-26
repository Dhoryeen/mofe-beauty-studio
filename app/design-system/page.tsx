import { ApprovalBanner } from "@/components/design-system/ApprovalBanner";
import { Button } from "@/components/design-system/Button";
import { GalleryCard } from "@/components/design-system/GalleryCard";
import { MilestoneTracker } from "@/components/design-system/MilestoneTracker";
import { PaymentStatus } from "@/components/design-system/PaymentStatus";
import { PriceBlock } from "@/components/design-system/PriceBlock";
import { QuoteTable } from "@/components/design-system/QuoteTable";
import { TextInput } from "@/components/design-system/TextInput";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-2xl font-semibold">Design system — Phase 1</h1>
        <p className="text-sm text-muted">
          Tokens: cream / blush / ink / gold / moss; radii sm/md/lg; card shadow. Focus ring is
          gold. Mobile-first, AA contrast targets.
        </p>
      </div>

      <Section title="Buttons / inputs">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Loading / disabled</Button>
        </div>
        <TextInput placeholder="Search gallery, e.g. bridal updo" aria-label="Search gallery" />
      </Section>

      <Section title="Gallery / pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <GalleryCard title="Soft bridal glam" meta="Makeup · Bridal" priceLabel="From ₦45,000 · starting price" />
          <GalleryCard title="Silk press + curls" meta="Hair · Birthday" priceLabel="₦25,000 fixed" />
          <GalleryCard title="Bridal full look" meta="Makeup + Hair · Bridal" priceLabel="Personalised quote" />
        </div>
        <PriceBlock
          name="Bridal makeup + hair"
          duration="3–4 hrs · studio or off-site"
          price="From ₦120,000"
          starting
          extras={["Trial appointment (separate fee)", "Touch-up kit", "Travel fee where applicable"]}
        />
      </Section>

      <Section title="Quote / approval / payment">
        <QuoteTable
          lines={[
            { label: "Service charges", amount: "₦120,000" },
            { label: "Travel", amount: "₦15,000" },
            { label: "Consultation credit", amount: "−₦10,000" },
            { label: "Deposit due now (30%)", amount: "₦37,500" }
          ]}
          total="₦125,000"
        />
        <ApprovalBanner state="awaiting" />
        <ApprovalBanner state="approved" />
        <ApprovalBanner state="expired" />
        <div className="flex flex-wrap gap-2">
          <PaymentStatus status="unpaid" />
          <PaymentStatus status="partially paid" />
          <PaymentStatus status="paid" />
          <PaymentStatus status="refund pending" />
        </div>
        <p className="text-xs text-muted">Failed or incomplete payment is never presented as confirmed.</p>
      </Section>

      <Section title="Milestones">
        <MilestoneTracker current={4} />
      </Section>
    </div>
  );
}
