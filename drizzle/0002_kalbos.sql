ALTER TABLE "notifications" ADD COLUMN "params" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locale" text DEFAULT 'lt' NOT NULL;