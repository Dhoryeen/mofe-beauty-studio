CREATE TABLE "consultation_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"consultation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"service_id" text NOT NULL,
	"look_id" text,
	"amount_naira" integer NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"applied_booking_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_credits_consultation_id_unique" UNIQUE("consultation_id")
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"look_id" text,
	"service_id" text NOT NULL,
	"staff_id" text,
	"mode" text DEFAULT 'in_person' NOT NULL,
	"slot_start" timestamp with time zone,
	"slot_end" timestamp with time zone,
	"fee_naira" integer NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"recommendations" text DEFAULT '' NOT NULL,
	"open_questions" text DEFAULT '' NOT NULL,
	"next_steps" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"user_id" text NOT NULL,
	"decision" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"look_id" text,
	"service_id" text NOT NULL,
	"booking_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"makeup" text DEFAULT '' NOT NULL,
	"hairstyle" text DEFAULT '' NOT NULL,
	"reference_photos" text[] DEFAULT '{}' NOT NULL,
	"extras" text[] DEFAULT '{}' NOT NULL,
	"prep_requirements" text DEFAULT '' NOT NULL,
	"service_naira" integer NOT NULL,
	"travel_naira" integer DEFAULT 0 NOT NULL,
	"credit_naira" integer DEFAULT 0 NOT NULL,
	"deposit_naira" integer NOT NULL,
	"total_naira" integer NOT NULL,
	"valid_until" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"service_id" text NOT NULL,
	"staff_id" text,
	"slot_start" timestamp with time zone NOT NULL,
	"slot_end" timestamp with time zone NOT NULL,
	"fee_naira" integer NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "booking_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "credit_naira" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "consultation_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "trial_id" text;--> statement-breakpoint
ALTER TABLE "consultation_credits" ADD CONSTRAINT "consultation_credits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_credits" ADD CONSTRAINT "consultation_credits_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_staff_id_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_approvals" ADD CONSTRAINT "quote_approvals_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_approvals" ADD CONSTRAINT "quote_approvals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trials" ADD CONSTRAINT "trials_staff_id_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;