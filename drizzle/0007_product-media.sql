CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "gallery" text[] DEFAULT '{}'::text[] NOT NULL;