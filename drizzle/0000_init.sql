CREATE TYPE "public"."agreement_status" AS ENUM('active', 'completed', 'cancelled', 'ended');--> statement-breakpoint
CREATE TYPE "public"."business_form" AS ENUM('company', 'individual');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('mowing', 'yard', 'pruning', 'helper', 'other');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."mode" AS ENUM('client', 'provider');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('active', 'withdrawn', 'accepted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."party" AS ENUM('client', 'provider');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'agreed', 'on_hold', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."timing_type" AS ENUM('asap', 'window', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('scheduled', 'done', 'confirmed', 'problem', 'cancelled');--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"request_version" integer NOT NULL,
	"offer_version" integer NOT NULL,
	"category" "category" NOT NULL,
	"description" text NOT NULL,
	"details" jsonb NOT NULL,
	"municipality" text NOT NULL,
	"locality" text NOT NULL,
	"frequency" "frequency",
	"series_end" date,
	"price_cents" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"included" text NOT NULL,
	"status" "agreement_status" DEFAULT 'active' NOT NULL,
	"cancelled_by" "party",
	"cancel_reason" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_request_private" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"contact_phone" text NOT NULL,
	"lat" double precision,
	"lng" double precision
);
--> statement-breakpoint
CREATE TABLE "job_request_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"category" "category" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"details" jsonb NOT NULL,
	"municipality" text NOT NULL,
	"locality" text NOT NULL,
	"timing_type" "timing_type" NOT NULL,
	"window_start" timestamp with time zone,
	"window_end" timestamp with time zone,
	"frequency" "frequency",
	"series_start" date,
	"series_end" date,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text NOT NULL,
	"dedupe_key" text,
	"read_at" timestamp with time zone,
	"email_wanted" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"included" text NOT NULL,
	"status" "offer_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"request_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_areas" (
	"user_id" uuid NOT NULL,
	"municipality" text NOT NULL,
	CONSTRAINT "provider_areas_user_id_municipality_pk" PRIMARY KEY("user_id","municipality")
);
--> statement-breakpoint
CREATE TABLE "provider_categories" (
	"user_id" uuid NOT NULL,
	"category" "category" NOT NULL,
	CONSTRAINT "provider_categories_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"business_form" "business_form" NOT NULL,
	"display_name" text NOT NULL,
	"company_code" text,
	"phone" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"active_mode" "mode" DEFAULT 'client' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreement_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "visit_status" DEFAULT 'scheduled' NOT NULL,
	"done_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"problem_note" text,
	"cancelled_by" "party",
	"cancel_reason" text,
	"cancelled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_request_id_job_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."job_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_request_id_job_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_request_private" ADD CONSTRAINT "job_request_private_request_id_job_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_request_revisions" ADD CONSTRAINT "job_request_revisions_request_id_job_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_request_id_job_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."job_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_areas" ADD CONSTRAINT "provider_areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agreements_one_live_per_request" ON "agreements" USING btree ("request_id") WHERE status in ('active', 'completed');--> statement-breakpoint
CREATE UNIQUE INDEX "agreements_offer_uq" ON "agreements" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "agreements_client_idx" ON "agreements" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "agreements_provider_idx" ON "agreements" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "job_photos_request_idx" ON "job_photos" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_request_revisions_uq" ON "job_request_revisions" USING btree ("request_id","version");--> statement-breakpoint
CREATE INDEX "job_requests_match_idx" ON "job_requests" USING btree ("status","municipality","category");--> statement-breakpoint
CREATE INDEX "job_requests_client_idx" ON "job_requests" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_request_provider_uq" ON "offers" USING btree ("request_id","provider_id");--> statement-breakpoint
CREATE INDEX "offers_provider_idx" ON "offers" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_areas_mun_idx" ON "provider_areas" USING btree ("municipality");--> statement-breakpoint
CREATE INDEX "provider_categories_cat_idx" ON "provider_categories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visits_agreement_seq_uq" ON "visits" USING btree ("agreement_id","seq");