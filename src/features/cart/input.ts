import { z } from "zod";

import { LIMITS, parseDecimal } from "@/lib/calculator";
import { SLUG_SHAPE } from "@/lib/route-gate";

/*
 * The test shop cart, shared by the browser and the server (docs/superpowers/specs/
 * 2026-10-19-test-shop-cart-checkout-design.md). A line is a product slug and an AREA in m2 hundredths
 * (integer, 0.01 - 10 000 m2, the calculator's limits). The browser keeps the cart in localStorage; the server
 * never trusts it: prices, availability and totals always come from `quoteCart` / `placeTestOrder`.
 */

export const CART_STORAGE_KEY = "stone.cart.v1";
export const CART_MAX_LINES = 20;
export const AREA_MIN_HUNDREDTHS = Math.round(LIMITS.area[0] * 100);
export const AREA_MAX_HUNDREDTHS = Math.round(LIMITS.area[1] * 100);
/** At most this many test checkout orders per user (checked inside the insert statement). */
export const TEST_ORDER_CAP = 50;
/** Line and order totals are stored as Postgres `integer` cents. */
export const MAX_CENTS = 2_147_483_647;

export type CartLine = { slug: string; areaHundredths: number };

export const cartLine = z
  .object({
    slug: z.string().max(100).regex(SLUG_SHAPE),
    areaHundredths: z
      .number()
      .int()
      .min(AREA_MIN_HUNDREDTHS)
      .max(AREA_MAX_HUNDREDTHS),
  })
  .strict();

export const cartItems = z.array(cartLine).max(CART_MAX_LINES);

/** The calculator's rounding: round(area hundredths x price per m2 in cents / 100), half up. */
export function lineTotalCents(areaHundredths: number, priceCents: number) {
  return Math.round((areaHundredths * priceCents) / 100);
}

/** Half-up to hundredths without binary drift (the calculator's rule). */
function toHundredths(value: number): number {
  return Math.round(Number(`${Number(value.toPrecision(12))}e2`));
}

/** "2,2" / "2.2" / "10 000" -> hundredths, with the calculator's parse and its 0.01 - 10 000 m2 range. */
export function parseArea(
  raw: string,
):
  | { ok: true; hundredths: number }
  | { ok: false; reason: "invalid" | "range" } {
  const value = parseDecimal(raw);
  if (value === null) return { ok: false, reason: "invalid" };
  const hundredths = toHundredths(value);
  if (hundredths < AREA_MIN_HUNDREDTHS || hundredths > AREA_MAX_HUNDREDTHS)
    return { ok: false, reason: "range" };
  return { ok: true, hundredths };
}

const capped = (h: number) => Math.min(h, AREA_MAX_HUNDREDTHS);

/** Duplicates merged by slug (first position kept), areas added and capped at 10 000 m2. */
export function mergeLines(lines: readonly CartLine[]): CartLine[] {
  const merged: CartLine[] = [];
  for (const line of lines) {
    const existing = merged.find((l) => l.slug === line.slug);
    if (existing)
      existing.areaHundredths = capped(
        existing.areaHundredths + line.areaHundredths,
      );
    else merged.push({ slug: line.slug, areaHundredths: line.areaHundredths });
  }
  return merged;
}

/** Adding a product that is already in the cart adds its area. */
export function addLine(lines: readonly CartLine[], line: CartLine) {
  return mergeLines([...lines, line]);
}

/** A stored cart, keeping only valid lines (a tampered or old entry never breaks the page). */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const valid = value.flatMap((entry) => {
    const parsed = cartLine.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  return mergeLines(valid).slice(0, CART_MAX_LINES);
}

export type QuoteLine =
  | {
      slug: string;
      areaHundredths: number;
      available: true;
      /** Stored translation for the locale, or null (the client falls back to messages, then the slug). */
      name: string | null;
      material: string;
      finish: string;
      image: string;
      imageFit: "cover" | "contain";
      priceCents: number;
      isPlaceholder: boolean;
      lineTotalCents: number;
    }
  | { slug: string; areaHundredths: number; available: false };

export type Quote = {
  lines: QuoteLine[];
  /** Sum of the available lines. */
  totalCents: number;
  /** The total is above what an order can store (`MAX_CENTS`); such a cart cannot be ordered. */
  tooLarge: boolean;
  /** Not empty, every line available and not too large. */
  orderable: boolean;
};

export type QuoteResult =
  { ok: true; quote: Quote } | { ok: false; code: "invalid" | "generic" };

export type PlaceOrderCode =
  | "unavailable"
  | "invalid"
  | "empty"
  | "product_unavailable"
  | "too_large"
  | "limit"
  | "conflict"
  | "generic";

export type PlaceOrderResult =
  | { ok: true; number: string }
  | { ok: false; code: "prices_changed"; quote: Quote }
  | { ok: false; code: PlaceOrderCode };
