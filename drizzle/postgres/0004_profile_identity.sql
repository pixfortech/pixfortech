CREATE TABLE "profile_slug_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"replaced_by" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "public_profile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_mime" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "experience" jsonb;--> statement-breakpoint
ALTER TABLE "profile_slug_history" ADD CONSTRAINT "profile_slug_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_slug_history_slug_idx" ON "profile_slug_history" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "profile_slug_history_user_idx" ON "profile_slug_history" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_idx" ON "user" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "user_public_slug_idx" ON "user" USING btree ("public_slug");