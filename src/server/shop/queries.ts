import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb, schema } from "../db";

/*
 * One order of the SESSION user (the order page passes `requireUser().id`). The query filters by the owner, so
 * another customer's number reads as "no such order" (the page answers with the localised 404).
 */

export type OwnOrderItem = {
  slug: string;
  name: string | null;
  material: string;
  image: string;
  imageFit: "cover" | "contain";
  finish: string;
  quantity: number;
  priceCents: number;
  /** Test checkout lines; null on the seeded demo rows (which show "Quantity N"). */
  areaHundredths: number | null;
  lineTotalCents: number | null;
};

export type OwnOrder = {
  number: string;
  kind: "demo" | "test_checkout";
  status: "in_progress" | "delivered";
  totalCents: number;
  createdAt: Date;
  items: OwnOrderItem[];
};

export async function getOwnOrder(
  userId: string,
  number: string,
  locale: string,
): Promise<OwnOrder | null> {
  const db = await getDb();
  if (!db) return null;
  const lang = locale === "en" ? "en" : "ru";
  const [order] = await db
    .select()
    .from(schema.order)
    .where(
      and(eq(schema.order.userId, userId), eq(schema.order.number, number)),
    )
    .limit(1);
  if (!order) return null;
  const items = await db
    .select({
      slug: schema.product.slug,
      material: schema.product.material,
      image: schema.product.image,
      imageFit: schema.product.imageFit,
      name: schema.productTranslation.name,
      finish: schema.orderItem.finish,
      quantity: schema.orderItem.quantity,
      priceCents: schema.orderItem.priceCents,
      areaHundredths: schema.orderItem.areaHundredths,
      lineTotalCents: schema.orderItem.lineTotalCents,
    })
    .from(schema.orderItem)
    .innerJoin(
      schema.product,
      eq(schema.orderItem.productId, schema.product.id),
    )
    .leftJoin(
      schema.productTranslation,
      and(
        eq(schema.productTranslation.productId, schema.product.id),
        eq(schema.productTranslation.locale, lang),
      ),
    )
    .where(eq(schema.orderItem.orderId, order.id))
    // Test checkout lines in cart order (position); demo rows have none and keep their id order.
    .orderBy(asc(schema.orderItem.position), asc(schema.orderItem.id));
  return {
    number: order.number,
    kind: order.kind === "test_checkout" ? "test_checkout" : "demo",
    status: order.status === "delivered" ? "delivered" : "in_progress",
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    items: items.map((item) => ({
      ...item,
      imageFit: item.imageFit === "contain" ? "contain" : "cover",
    })),
  };
}
