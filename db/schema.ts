import { boolean, integer, jsonb, pgTable, text, timestamp, date } from "drizzle-orm/pg-core";

// --- Better Auth tables (better-auth/adapters/drizzle, provider "pg") ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // App role: client | manager | beautician_consultant. New sign-ups default to client.
  role: text("role").notNull().default("client"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// --- App tables (Phase 2 slice) ---

// Business settings seeded from PRD §6 recommended defaults.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Service catalogue (PRD §5.1). Prices stored as integer naira.
export const services = pgTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  duration: text("duration").notNull(),
  description: text("description").notNull().default(""),
  priceNaira: integer("price_naira").notNull(),
  priceType: text("price_type").notNull().default("fixed"),
  category: text("category").notNull().default("makeup"),
  availableAt: text("available_at").notNull().default("studio"),
  consultRequired: boolean("consult_required").notNull().default(false),
  extras: text("extras").array().notNull().default([]),
  durationMin: integer("duration_min").notNull().default(60),
  active: boolean("active").notNull().default(true)
});

// Inspiration gallery (PRD §5.1). imageUrl null => styled placeholder card.
export const galleryItems = pgTable("gallery_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  service: text("service").notNull().default("makeup"),
  occasion: text("occasion").notNull().default("everyday"),
  finish: text("finish"),
  hairLength: text("hair_length"),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0)
});

// Client inspiration boards (PRD §5.2). Drafts stay drafts; booking snapshots come later.
export const looks = pgTable("looks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  occasion: text("occasion").notNull().default("everyday"),
  makeupPreferences: text("makeup_preferences").notNull().default(""),
  hairstyle: text("hairstyle").notNull().default(""),
  hairLengthTexture: text("hair_length_texture").notNull().default(""),
  finish: text("finish").notNull().default(""),
  avoidDetails: text("avoid_details").notNull().default(""),
  sensitivities: text("sensitivities").notNull().default(""),
  productPreferences: text("product_preferences").notNull().default(""),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const lookImages = pgTable("look_images", {
  id: text("id").primaryKey(),
  lookId: text("look_id")
    .notNull()
    .references(() => looks.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  source: text("source").notNull().default("upload"),
  galleryItemId: text("gallery_item_id"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// --- Phase 4: booking + payments ---

// Public portfolio for users with the beautician_consultant role.
export const staffProfiles = pgTable("staff_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  craft: text("craft").notNull().default("makeup"),
  bio: text("bio").notNull().default(""),
  active: boolean("active").notNull().default(true)
});

// Weekly working hours, minutes from midnight. weekday 0=Sunday.
export const availabilityRules = pgTable("availability_rules", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startMin: integer("start_min").notNull(),
  endMin: integer("end_min").notNull()
});

// Full- or partial-day blocks (leave, etc.).
export const availabilityExceptions = pgTable("availability_exceptions", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  startMin: integer("start_min"),
  endMin: integer("end_min"),
  reason: text("reason").notNull().default("")
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  lookId: text("look_id"),
  // pending_payment | confirmed | reschedule_pending | completed | cancelled | request
  status: text("status").notNull().default("pending_payment"),
  slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
  slotEnd: timestamp("slot_end", { withTimezone: true }).notNull(),
  readinessDeadline: timestamp("readiness_deadline", { withTimezone: true }),
  preferredTime: text("preferred_time"),
  // Phase 6: off-site location, tentative-hold expiry, group linkage.
  location: text("location"),
  holdUntil: timestamp("hold_until", { withTimezone: true }),
  groupId: text("group_id"),
  totalNaira: integer("total_naira").notNull(),
  depositNaira: integer("deposit_naira").notNull(),
  paidNaira: integer("paid_naira").notNull().default(0),
  // Consultation credit applied to this booking (separate from cash paid).
  creditNaira: integer("credit_naira").notNull().default(0),
  // unpaid | partial | paid | refund_pending | refunded
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const bookingStaff = pgTable("booking_staff", {
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  staffId: text("staff_id")
    .notNull()
    .references(() => user.id),
  kind: text("kind").notNull().default("primary")
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  consultationId: text("consultation_id"),
  trialId: text("trial_id"),
  provider: text("provider").notNull().default("mock"),
  reference: text("reference").notNull().unique(),
  amountNaira: integer("amount_naira").notNull(),
  kind: text("kind").notNull().default("deposit"),
  // pending | success | failed | refunded
  status: text("status").notNull().default("pending"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  timeRange: text("time_range"),
  note: text("note").notNull().default(""),
  // open | notified | closed
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// --- Phase 6: studio-confirmation requests and group coordination ---

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  organiserId: text("organiser_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }),
  location: text("location"),
  readinessDeadline: timestamp("readiness_deadline", { withTimezone: true }),
  sizeInt: integer("size_int").notNull().default(1),
  // organiser | split — who pays.
  payMode: text("pay_mode").notNull().default("split"),
  sharedNaira: integer("shared_naira").notNull().default(0),
  sharedNote: text("shared_note").notNull().default(""),
  // request | quoted | awaiting_deposits | confirmed | cancelled
  status: text("status").notNull().default("request"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const groupMembers = pgTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const groupInvites = pgTable("group_invites", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  // pending | accepted
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// --- Phase 5: consultations, quotes/approvals, trials ---

export const consultations = pgTable("consultations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lookId: text("look_id"),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  staffId: text("staff_id").references(() => user.id),
  // in_person | video
  mode: text("mode").notNull().default("in_person"),
  slotStart: timestamp("slot_start", { withTimezone: true }),
  slotEnd: timestamp("slot_end", { withTimezone: true }),
  feeNaira: integer("fee_naira").notNull(),
  // pending_payment | booked | completed | cancelled
  status: text("status").notNull().default("pending_payment"),
  recommendations: text("recommendations").notNull().default(""),
  openQuestions: text("open_questions").notNull().default(""),
  nextSteps: text("next_steps").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Single-use credit issued when a paid consultation completes.
export const consultationCredits = pgTable("consultation_credits", {
  id: text("id").primaryKey(),
  consultationId: text("consultation_id").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  lookId: text("look_id"),
  amountNaira: integer("amount_naira").notNull(),
  // issued | applied | void
  status: text("status").notNull().default("issued"),
  appliedBookingId: text("applied_booking_id"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Look summary + personalised quote. New versions supersede old ones; history retained.
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lookId: text("look_id"),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  bookingId: text("booking_id"),
  version: integer("version").notNull().default(1),
  supersedesId: text("supersedes_id"),
  // draft | awaiting_approval | approved | rejected | expired | superseded
  status: text("status").notNull().default("draft"),
  makeup: text("makeup").notNull().default(""),
  hairstyle: text("hairstyle").notNull().default(""),
  referencePhotos: text("reference_photos").array().notNull().default([]),
  extras: text("extras").array().notNull().default([]),
  prepRequirements: text("prep_requirements").notNull().default(""),
  serviceNaira: integer("service_naira").notNull(),
  travelNaira: integer("travel_naira").notNull().default(0),
  creditNaira: integer("credit_naira").notNull().default(0),
  depositNaira: integer("deposit_naira").notNull(),
  totalNaira: integer("total_naira").notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  note: text("note").notNull().default(""),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const quoteApprovals = pgTable("quote_approvals", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  decision: text("decision").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const trials = pgTable("trials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  staffId: text("staff_id").references(() => user.id),
  slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
  slotEnd: timestamp("slot_end", { withTimezone: true }).notNull(),
  feeNaira: integer("fee_naira").notNull(),
  // pending_payment | booked | completed | cancelled
  status: text("status").notNull().default("pending_payment"),
  feedback: text("feedback").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
