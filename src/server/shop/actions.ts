"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  cartItems,
  MAX_CENTS,
  mergeLines,
  TEST_ORDER_CAP,
  type CartLine,
  type PlaceOrderResult,
  type QuoteResult,
} from "@/features/cart/input";
import { requireUser } from "@/server/auth/guards";
import { requestLocale } from "@/server/auth/request-locale";

import { getDb } from "../db";
import { sameOrigin } from "../same-origin";
import { buildQuote } from "./quote";
import { countTestOrders, findTestOrder, insertTestOrder } from "./store";

/*
 * Test shop checkout (docs/superpowers/specs/2026-10-19-test-shop-cart-checkout-design.md). No payment is taken
 * and nothing is delivered: an order is a record the customer and the admin can follow.
 */

function parseCart(items: unknown): CartLine[] | null {
  const parsed = cartItems.safeParse(items);
  return parsed.success ? mergeLines(parsed.data) : null;
}

/**
 * Public and read-only by design: prices the visitor's cart (a Guest builds a cart too). It takes only slugs and
 * areas, never a user id, reads only published catalog data and writes nothing.
 */
export async function quoteCart(
  items: unknown,
  locale: unknown,
): Promise<QuoteResult> {
  const lines = parseCart(items);
  if (!lines || lines.length === 0) return { ok: false, code: "invalid" };
  try {
    return {
      ok: true,
      quote: await buildQuote(lines, locale === "en" ? "en" : "ru"),
    };
  } catch {
    return { ok: false, code: "generic" };
  }
}

const orderInput = z
  .object({
    items: z.unknown(),
    key: z.uuid(),
    expectedTotalCents: z.number().int().min(0).max(MAX_CENTS),
  })
  .strict();

function digestOf(lines: readonly CartLine[]) {
  return createHash("sha256").update(JSON.stringify(lines)).digest("hex");
}

/**
 * Places a test order for the signed-in user. The server re-prices the cart; when its total differs from the one
 * the customer confirmed it answers `prices_changed` with the fresh quote and orders nothing. A retry with the same
 * key returns the same order (or `conflict` when the content differs).
 */
export async function placeTestOrder(
  input: unknown,
): Promise<PlaceOrderResult> {
  const user = await requireUser(await requestLocale());
  if (!(await sameOrigin())) return { ok: false, code: "invalid" };
  const parsed = orderInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const lines = parseCart(parsed.data.items);
  if (!lines) return { ok: false, code: "invalid" };
  if (lines.length === 0) return { ok: false, code: "empty" };
  const { key, expectedTotalCents } = parsed.data;
  const digest = digestOf(lines);
  const settle = (found: { number: string; digest: string | null }) =>
    found.digest === digest
      ? ({ ok: true, number: found.number } as const)
      : ({ ok: false, code: "conflict" } as const);
  try {
    const db = await getDb();
    if (!db) return { ok: false, code: "unavailable" };
    const existing = await findTestOrder(db, user.id, key);
    if (existing) return settle(existing);

    const locale = await requestLocale();
    const quote = await buildQuote(lines, locale);
    if (quote.tooLarge) return { ok: false, code: "too_large" };
    if (!quote.orderable) return { ok: false, code: "product_unavailable" };
    if (quote.totalCents !== expectedTotalCents)
      return { ok: false, code: "prices_changed", quote };
    if ((await countTestOrders(db, user.id)) >= TEST_ORDER_CAP)
      return { ok: false, code: "limit" };

    let number: string | null;
    try {
      number = await insertTestOrder(
        db,
        user.id,
        key,
        digest,
        lines,
        expectedTotalCents,
      );
    } catch {
      number = null;
    }
    if (number) {
      revalidatePath("/[locale]/account", "layout");
      revalidatePath("/[locale]/admin", "layout");
      return { ok: true, number };
    }
    // Nothing inserted: a concurrent attempt with this key won, or something changed between the quote and the insert.
    const won = await findTestOrder(db, user.id, key);
    if (won) return settle(won);
    if ((await countTestOrders(db, user.id)) >= TEST_ORDER_CAP)
      return { ok: false, code: "limit" };
    const fresh = await buildQuote(lines, locale);
    if (fresh.tooLarge) return { ok: false, code: "too_large" };
    if (!fresh.orderable) return { ok: false, code: "product_unavailable" };
    if (fresh.totalCents !== expectedTotalCents)
      return { ok: false, code: "prices_changed", quote: fresh };
    return { ok: false, code: "generic" };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}
