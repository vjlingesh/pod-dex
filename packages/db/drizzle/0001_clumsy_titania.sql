CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_user_id" text,
	"title" text NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"source" text DEFAULT 'upload' NOT NULL,
	"audio_key" text,
	"audio_content_type" text,
	"audio_bytes" bigint,
	"duration_seconds" bigint,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episodes_org_idx" ON "episodes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "episodes_org_status_idx" ON "episodes" USING btree ("organization_id","status");