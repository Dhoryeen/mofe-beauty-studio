import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
