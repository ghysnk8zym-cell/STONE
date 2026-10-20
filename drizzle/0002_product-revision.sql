ALTER TABLE "product" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_revision_check" CHECK ("product"."revision" >= 0);