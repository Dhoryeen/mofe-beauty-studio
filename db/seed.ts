import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { auth } from "../lib/auth";
import { services, settings, user } from "./schema";

// PRD §6 recommended defaults.
const DEFAULT_SETTINGS: Array<[string, string]> = [
  ["currency", "NGN"],
  ["deposit_pct", "30"],
  ["quote_validity_days", "7"],
  ["free_reschedules_standard", "1"],
  ["free_reschedule_notice_hours", "48"],
  ["consultation_credit_applies_to", "associated_service"],
  ["trial_deducted_from_service", "false"],
  ["group_confirmation", "all_required_deposits_paid"],
  ["review_per_booking", "1"],
  ["review_publication", "consent_required"],
  ["photo_public_use_default", "unselected"]
];

// Mirrors lib/mock.ts so the catalogue page can read live data.
const SEED_SERVICES = [
  {
    id: "svc-makeup",
    name: "Signature makeup",
    duration: "90 mins · studio",
    priceNaira: 45000,
    priceType: "fixed",
    category: "makeup",
    availableAt: "studio",
    consultRequired: false
  },
  {
    id: "svc-hair",
    name: "Silk press + curls",
    duration: "2 hrs · studio",
    priceNaira: 25000,
    priceType: "fixed",
    category: "hair",
    availableAt: "studio",
    consultRequired: false
  },
  {
    id: "svc-bridal",
    name: "Bridal full look",
    duration: "3–4 hrs · studio or off-site",
    priceNaira: 120000,
    priceType: "starting",
    category: "combined",
    availableAt: "both",
    consultRequired: true
  }
];

async function main() {
  for (const [key, value] of DEFAULT_SETTINGS) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  for (const s of SEED_SERVICES) {
    await db
      .insert(services)
      .values(s)
      .onConflictDoUpdate({
        target: services.id,
        set: {
          name: s.name,
          duration: s.duration,
          priceNaira: s.priceNaira,
          priceType: s.priceType,
          category: s.category,
          availableAt: s.availableAt,
          consultRequired: s.consultRequired,
          active: true
        }
      });
  }

  const email = process.env.MANAGER_EMAIL ?? "manager@mofe.local";
  const password = process.env.MANAGER_PASSWORD ?? "mofe-manager-dev-only";
  const existing = await db.select().from(user).where(eq(user.email, email));
  if (existing.length === 0) {
    const res = await auth.api.signUpEmail({ body: { name: "Studio Manager", email, password } });
    const id = (res as { user?: { id?: string } })?.user?.id;
    if (!id) throw new Error("manager sign-up did not return a user id");
    await db.update(user).set({ role: "manager" }).where(eq(user.id, id));
    console.log(`manager created: ${email} (dev only)`);
  } else {
    await db.update(user).set({ role: "manager" }).where(eq(user.email, email));
    console.log(`manager ensured: ${email} (dev only)`);
  }
  console.log("seed complete");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
