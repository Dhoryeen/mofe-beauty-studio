CREATE TABLE "gallery_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"service" text DEFAULT 'makeup' NOT NULL,
	"occasion" text DEFAULT 'everyday' NOT NULL,
	"finish" text,
	"hair_length" text,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "look_images" (
	"id" text PRIMARY KEY NOT NULL,
	"look_id" text NOT NULL,
	"url" text NOT NULL,
	"source" text DEFAULT 'upload' NOT NULL,
	"gallery_item_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "looks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"occasion" text DEFAULT 'everyday' NOT NULL,
	"makeup_preferences" text DEFAULT '' NOT NULL,
	"hairstyle" text DEFAULT '' NOT NULL,
	"hair_length_texture" text DEFAULT '' NOT NULL,
	"finish" text DEFAULT '' NOT NULL,
	"avoid_details" text DEFAULT '' NOT NULL,
	"sensitivities" text DEFAULT '' NOT NULL,
	"product_preferences" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "extras" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "look_images" ADD CONSTRAINT "look_images_look_id_looks_id_fk" FOREIGN KEY ("look_id") REFERENCES "public"."looks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "looks" ADD CONSTRAINT "looks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;