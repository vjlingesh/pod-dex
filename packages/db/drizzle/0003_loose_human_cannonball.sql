CREATE TABLE "outputs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"episode_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" jsonb NOT NULL,
	"generated_by" text,
	"marked_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outputs_org_idx" ON "outputs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "outputs_episode_idx" ON "outputs" USING btree ("episode_id");