CREATE TABLE "site_content" (
	"key" text NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "site_content_key_locale_pk" PRIMARY KEY("key","locale"),
	CONSTRAINT "site_content_locale_check" CHECK ("site_content"."locale" in ('ru', 'en')),
	CONSTRAINT "site_content_text_check" CHECK (char_length("site_content"."text") between 1 and 200)
);
