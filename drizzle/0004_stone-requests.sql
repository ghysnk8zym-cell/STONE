CREATE TABLE "stone_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"user_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text NOT NULL,
	"material" text NOT NULL,
	"color" text NOT NULL,
	"finish" text NOT NULL,
	"length_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"thickness_mm" integer NOT NULL,
	"quantity" integer NOT NULL,
	"reference_image" text,
	"quote_unit_price_cents" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stone_request_number_unique" UNIQUE("number"),
	CONSTRAINT "stone_request_number_check" CHECK ("stone_request"."number" ~ '^Q-[0-9]{3,9}$'),
	CONSTRAINT "stone_request_status_check" CHECK ("stone_request"."status" in ('new', 'draft_quote', 'awaiting_payment')),
	CONSTRAINT "stone_request_quote_check" CHECK ("stone_request"."quote_unit_price_cents" is null or "stone_request"."quote_unit_price_cents" between 0 and 10000000),
	CONSTRAINT "stone_request_status_quote_check" CHECK ("stone_request"."status" = 'new' or "stone_request"."quote_unit_price_cents" is not null),
	CONSTRAINT "stone_request_dimensions_check" CHECK ("stone_request"."length_mm" between 1 and 10000 and "stone_request"."width_mm" between 1 and 10000 and "stone_request"."thickness_mm" between 1 and 10000),
	CONSTRAINT "stone_request_quantity_check" CHECK ("stone_request"."quantity" between 1 and 10000),
	CONSTRAINT "stone_request_revision_check" CHECK ("stone_request"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "stone_request" ADD CONSTRAINT "stone_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stone_request_user_idx" ON "stone_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stone_request_created_idx" ON "stone_request" USING btree ("created_at","number");--> statement-breakpoint
CREATE INDEX "stone_request_status_created_idx" ON "stone_request" USING btree ("status","created_at");