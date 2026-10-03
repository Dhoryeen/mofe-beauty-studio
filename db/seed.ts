import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { auth } from "../lib/auth";
import { availabilityRules, galleryItems, services, settings, staffProfiles, user } from "./schema";

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
  ["photo_public_use_default", "unselected"],
  ["request_hold_hours", "48"],
  ["cancellation_terms", "Cancel more than 48 hours ahead for a full refund of amounts paid. Inside 48 hours, refunds are at management discretion. Consultation and trial fees follow their own published terms."],
  ["consultation_fee", "10000"],
  ["consultation_duration_min", "30"],
  ["trial_fee", "15000"],
  [
    "complex_look_guidance",
    "A look counts as complex when it involves bridal parties of 3+, full-day bookings, avant-garde or editorial styling, off-site setups, or techniques needing extra preparation. Bridal and complex looks always require a paid consultation before booking."
  ]
];

// Mirrors lib/mock.ts so the catalogue page can read live data.
const SEED_SERVICES = [
  {
    id: "svc-makeup",
    name: "Signature makeup",
    duration: "90 mins · studio",
    durationMin: 90,
    description: "Skin-first makeup tailored to your finish, from natural to full glam.",
    priceNaira: 45000,
    priceType: "fixed",
    category: "makeup",
    availableAt: "studio",
    consultRequired: false,
    extras: ["Touch-up kit", "Lashes"]
  },
  {
    id: "svc-hair",
    name: "Silk press + curls",
    duration: "2 hrs · studio",
    durationMin: 120,
    description: "Smooth silk press finished with soft curls for any occasion.",
    priceNaira: 25000,
    priceType: "fixed",
    category: "hair",
    availableAt: "studio",
    consultRequired: false,
    extras: ["Deep conditioning treatment"]
  },
  {
    id: "svc-party",
    name: "Party full look",
    duration: "3 hrs · studio",
    durationMin: 180,
    description: "Makeup plus hairstyling for parties and events, two specialists.",
    priceNaira: 85000,
    priceType: "fixed",
    category: "combined",
    availableAt: "studio",
    consultRequired: false,
    extras: ["Touch-up kit"]
  },
  {
    id: "svc-bridal",
    name: "Bridal full look",
    duration: "3–4 hrs · studio or off-site",
    durationMin: 210,
    description: "Complete bridal makeup and hairstyling with trial option and day-of touch-ups.",
    priceNaira: 120000,
    priceType: "starting",
    category: "combined",
    availableAt: "both",
    consultRequired: true,
    extras: ["Trial appointment (separate fee)", "Touch-up kit", "Travel fee where applicable"]
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
          description: s.description,
          durationMin: s.durationMin,
          extras: s.extras,
          active: true
        }
      });
  }

  const SEED_GALLERY = [
    { id: "gal-01", title: "Soft bridal glam", service: "makeup", occasion: "bridal", finish: "soft-glam", hairLength: null, sortOrder: 1, imageUrl: "/samples/soft-bridal-glam.svg" },
    { id: "gal-02", title: "Classic bridal updo", service: "hair", occasion: "bridal", finish: null, hairLength: "long", sortOrder: 2, imageUrl: "/samples/classic-bridal-updo.svg" },
    { id: "gal-03", title: "Bridal full look", service: "combined", occasion: "bridal", finish: "full-glam", hairLength: "long", sortOrder: 3, imageUrl: "/samples/bridal-full-look.svg" },
    { id: "gal-04", title: "Birthday silk press", service: "hair", occasion: "birthday", finish: null, hairLength: "medium", sortOrder: 4, imageUrl: "/samples/birthday-silk-press.svg" },
    { id: "gal-05", title: "Birthday soft glam", service: "makeup", occasion: "birthday", finish: "soft-glam", hairLength: null, sortOrder: 5, imageUrl: "/samples/birthday-soft-glam.svg" },
    { id: "gal-06", title: "Everyday polish", service: "makeup", occasion: "everyday", finish: "natural", hairLength: null, sortOrder: 6, imageUrl: "/samples/everyday-polish.svg" },
    { id: "gal-07", title: "Everyday silk press", service: "hair", occasion: "everyday", finish: null, hairLength: "short", sortOrder: 7, imageUrl: "/samples/everyday-silk-press.svg" },
    { id: "gal-08", title: "Matte party look", service: "combined", occasion: "other", finish: "matte", hairLength: "extensions", sortOrder: 8, imageUrl: "/samples/matte-party-look.svg" }
  ];
  for (const g of SEED_GALLERY) {
    await db
      .insert(galleryItems)
      .values({ ...g, active: true })
      .onConflictDoUpdate({
        target: galleryItems.id,
        // NOTE: active is intentionally untouched here — items hidden
        // in the gallery admin stay hidden across re-seeds.
        set: { title: g.title, service: g.service, occasion: g.occasion, finish: g.finish, hairLength: g.hairLength, sortOrder: g.sortOrder, imageUrl: g.imageUrl }
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

  // --- Specialists (limited admins) with Mon–Sat 9:00–18:00 availability ---
  const staffPassword = process.env.STAFF_PASSWORD ?? "mofe-staff-dev-only";
  const STAFF = [
    { name: "Adaeze", email: "adaeze@mofe.local", craft: "makeup", bio: "Signature makeup, soft glam to full bridal." },
    { name: "Funmi", email: "funmi@mofe.local", craft: "hair", bio: "Silk press, curls and occasion styling." }
  ];
  for (const s of STAFF) {
    const rows = await db.select().from(user).where(eq(user.email, s.email));
    let id: string | undefined = rows[0]?.id;
    if (!id) {
      const res = await auth.api.signUpEmail({ body: { name: s.name, email: s.email, password: staffPassword } });
      id = (res as { user?: { id?: string } })?.user?.id;
      if (!id) throw new Error(`staff sign-up failed for ${s.email}`);
    }
    await db.update(user).set({ role: "beautician_consultant" }).where(eq(user.id, id));
    await db
      .insert(staffProfiles)
      .values({ userId: id, displayName: `${s.name} · ${s.craft}`, craft: s.craft, bio: s.bio, active: true })
      .onConflictDoUpdate({
        target: staffProfiles.userId,
        set: { displayName: `${s.name} · ${s.craft}`, craft: s.craft, bio: s.bio, active: true }
      });
    for (let weekday = 1; weekday <= 6; weekday++) {
      await db
        .insert(availabilityRules)
        .values({ id: `${id}-${weekday}`, staffId: id, weekday, startMin: 540, endMin: 1080 })
        .onConflictDoNothing();
    }
    console.log(`specialist ensured: ${s.email} (dev only)`);
  }
  console.log("staff seed complete");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
