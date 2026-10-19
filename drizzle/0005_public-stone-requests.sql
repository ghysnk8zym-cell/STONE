CREATE SEQUENCE "public"."stone_request_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999999 START WITH 100000000 CACHE 1;--> statement-breakpoint
CREATE TABLE "stone_request_budget" (
	"id" integer PRIMARY KEY NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"users" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "stone_request_budget_check" CHECK ("stone_request_budget"."id" = 1 and "stone_request_budget"."total" between 0 and 50)
);
--> statement-breakpoint
ALTER TABLE "stone_request" ALTER COLUMN "number" SET DEFAULT 'Q-' || nextval('stone_request_number_seq');--> statement-breakpoint
ALTER TABLE "stone_request" ADD COLUMN "photo_base64" text;--> statement-breakpoint
ALTER TABLE "stone_request" ADD COLUMN "submission_key" uuid;--> statement-breakpoint
ALTER TABLE "stone_request" ADD COLUMN "submission_digest" text;--> statement-breakpoint
ALTER TABLE "stone_request" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "stone_request" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "stone_request" ADD COLUMN "contact_phone" text;--> statement-breakpoint
INSERT INTO "stone_request_budget" ("id") VALUES (1);--> statement-breakpoint
CREATE UNIQUE INDEX "stone_request_submission_idx" ON "stone_request" USING btree ("user_id","submission_key");--> statement-breakpoint
ALTER TABLE "stone_request" ADD CONSTRAINT "stone_request_submission_check" CHECK (("stone_request"."submission_key" is null and "stone_request"."submission_digest" is null and "stone_request"."photo_base64" is null and "stone_request"."contact_name" is null and "stone_request"."contact_email" is null and "stone_request"."contact_phone" is null) or ("stone_request"."submission_key" is not null and "stone_request"."submission_digest" is not null and "stone_request"."photo_base64" is not null and length("stone_request"."photo_base64") between 1 and 699052 and "stone_request"."contact_name" is not null and "stone_request"."contact_email" is not null and "stone_request"."contact_phone" is not null));
