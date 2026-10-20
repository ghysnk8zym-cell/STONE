import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { TEST_ORDER_CAP, type CartLine } from "@/features/cart/input";

import { type Db, schema } from "../db";

/** Drizzle's three supported Postgres drivers expose raw rows in this shape. */
function rows<T>(result: unknown): T[] {
  return Array.isArray(result) ? result : (result as { rows: T[] }).rows;
}

/** The order an earlier attempt with this key saved for this user, if any. */
export async function findTestOrder(db: Db, owner: string, key: string) {
  const o = schema.order;
  const [existing] = await db
    .select({ number: o.number, digest: o.submissionDigest })
    .from(o)
    .where(and(eq(o.userId, owner), eq(o.idempotencyKey, key)))
    .limit(1);
  return existing ?? null;
}

export async function countTestOrders(db: Db, owner: string) {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM "order" WHERE user_id = ${owner} AND kind = 'test_checkout'`);
  return rows<{ n: number }>(result)[0]?.n ?? 0;
}

/**
 * One statement (works on pg, PGlite and Neon HTTP, which has no interactive transactions): prices the lines from
 * the published products, and only when every line is still available, the server total equals what the customer
 * confirmed and the user is under the demo cap, inserts the order and all its items. A concurrent attempt with the
 * same key hits the unique index and inserts nothing. Returns the new order number, or null when nothing was
 * inserted (the caller works out why).
 */
export async function insertTestOrder(
  db: Db,
  owner: string,
  key: string,
  digest: string,
  lines: readonly CartLine[],
  expectedTotalCents: number,
) {
  const input = JSON.stringify(
    lines.map((line, ord) => ({
      slug: line.slug,
      area: line.areaHundredths,
      ord,
    })),
  );
  const result = await db.execute(sql`
    WITH input AS (
      SELECT * FROM jsonb_to_recordset(${input}::jsonb) AS i(slug text, area integer, ord integer)
    ),
    priced AS (
      SELECT input.ord, p.id AS product_id, p.finish, p.price_cents, input.area,
        round(input.area::numeric * p.price_cents / 100)::integer AS line_total
      FROM input JOIN product p ON p.slug = input.slug AND p.published
    ),
    allowed AS (
      SELECT (SELECT coalesce(sum(line_total), 0) FROM priced)::integer AS total
      WHERE (SELECT count(*) FROM priced) = ${lines.length}
        AND (SELECT coalesce(sum(line_total), 0) FROM priced) = ${expectedTotalCents}
        AND (SELECT count(*) FROM "order" WHERE user_id = ${owner} AND kind = 'test_checkout') < ${TEST_ORDER_CAP}
    ),
    saved AS (
      INSERT INTO "order" (number, user_id, status, total_cents, kind, idempotency_key, submission_digest)
      SELECT 'T-' || nextval('order_number_seq'), ${owner}, 'in_progress', allowed.total, 'test_checkout', ${key}::uuid, ${digest}
      FROM allowed
      ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
      RETURNING id, number
    ),
    items AS (
      INSERT INTO order_item (order_id, product_id, finish, quantity, price_cents, area_hundredths, line_total_cents, position)
      SELECT saved.id, priced.product_id, priced.finish, 1, priced.price_cents, priced.area, priced.line_total, priced.ord
      FROM saved CROSS JOIN priced ORDER BY priced.ord
      RETURNING 1
    )
    SELECT number, (SELECT count(*) FROM items)::int AS items FROM saved`);
  return rows<{ number: string; items: number }>(result)[0]?.number ?? null;
}
