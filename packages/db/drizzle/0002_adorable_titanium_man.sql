CREATE TABLE "transcripts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"episode_id" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"language" text,
	"full_text" text NOT NULL,
	"segments" jsonb NOT NULL,
	"words" jsonb NOT NULL,
	"duration_seconds" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcripts_org_idx" ON "transcripts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "transcripts_episode_idx" ON "transcripts" USING btree ("episode_id");