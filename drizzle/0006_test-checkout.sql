CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999999 START WITH 2001 CACHE 1;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "kind" text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "idempotency_key" uuid;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "submission_digest" text;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "area_hundredths" integer;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "line_total_cents" integer;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "position" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "order_user_idempotency_idx" ON "order" USING btree ("user_id","idempotency_key") WHERE "order"."idempotency_key" is not null;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_kind_check" CHECK ("order"."kind" in ('demo', 'test_checkout'));--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_area_check" CHECK ("order_item"."area_hundredths" is null or "order_item"."area_hundredths" between 1 and 1000000);--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_line_total_check" CHECK ("order_item"."line_total_cents" is null or "order_item"."line_total_cents" >= 0);--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_position_check" CHECK ("order_item"."position" is null or "order_item"."position" between 0 and 99);