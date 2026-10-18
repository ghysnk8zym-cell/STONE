import { z } from "zod";

import {
  hasHiddenCharacters,
  hasHiddenCharactersExceptNewline,
} from "@/lib/plain-text";
import { SLUG_SHAPE } from "@/lib/route-gate";

import { COLOR_GROUPS, COLORS, FINISHES, MATERIALS } from "../catalog/types";
import { isCatalogImage } from "./images";

/*
 * Validation of what the admin product form sends. A server action is a public POST endpoint, so
 * every field is checked here whatever the form does. Money is integer cents (the form converts the
 * dollars the admin types); texts are plain text on one line (names) or several (descriptions) with
 * no control characters; the picture must be a catalog image of the asset manifest.
 */

export const SLUG_MAX = 80;
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 1000;
/** USD 100 000 per m2 is far above any real price and keeps the integer column safe. */
export const PRICE_MAX_CENTS = 10_000_000;
export const DIMENSION_MAX_MM = 10_000;

// A name is one line of plain text; a description may also have line feeds. Control characters AND invisible
// formatting characters (bidi overrides, zero-width, BOM) are refused in both (src/lib/plain-text.ts).
const name = z
  .string()
  .trim()
  .min(1)
  .max(NAME_MAX)
  .refine((value) => !hasHiddenCharacters(value));

const description = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX)
  .refine((value) => !hasHiddenCharactersExceptNewline(value));

const cents = z.number().int().min(0).max(PRICE_MAX_CENTS);
const mm = z.number().int().min(1).max(DIMENSION_MAX_MM);

/**
 * Slugs that would collide with a route word: `/admin/products/new` is the Add product page, so a product
 * called `new` could never be opened for editing. Add a word here when a static sibling of a slug route appears.
 */
export const RESERVED_SLUGS: readonly string[] = ["new"];

export const slugSchema = z
  .string()
  .min(1)
  .max(SLUG_MAX)
  .regex(SLUG_SHAPE, { error: "lowercase letters, digits and single dashes" })
  .refine((slug) => !RESERVED_SLUGS.includes(slug), {
    error: "reserved word",
  });

const productFields = z.object({
  nameRu: name,
  nameEn: name,
  descriptionRu: description,
  descriptionEn: description,
  material: z.enum(MATERIALS),
  color: z.enum(COLORS),
  colorGroup: z.enum(COLOR_GROUPS),
  finish: z.enum(FINISHES),
  lengthMm: mm,
  widthMm: mm,
  thicknessMm: mm,
  priceCents: cents,
  oldPriceCents: cents.nullable(),
  discountPercent: z.number().int().min(0).max(100).nullable(),
  image: z.string().refine(isCatalogImage, { error: "not a catalog image" }),
  published: z.boolean(),
});

const oldPriceAbovePrice = (value: {
  priceCents: number;
  oldPriceCents: number | null;
}) => value.oldPriceCents === null || value.oldPriceCents > value.priceCents;
const oldPriceIssue = {
  path: ["oldPriceCents"],
  error: "the old price must be above the price",
};

/** Fields of a product (everything but the slug, which names the product and never changes). */
export const productInputSchema = productFields.refine(
  oldPriceAbovePrice,
  oldPriceIssue,
);

export const createProductSchema = productFields
  .extend({ slug: slugSchema })
  .refine(oldPriceAbovePrice, oldPriceIssue);

export type ProductInput = z.infer<typeof productFields>;
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Names of the fields that failed, for the form to mark them. */
export function failedFields(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "")))]
    .filter(Boolean)
    .sort();
}

export const ORDER_NUMBER = /^[A-Z]-\d{3,9}$/;
