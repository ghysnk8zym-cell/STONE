import "server-only";

import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { getDb, schema, type Db } from "../db";

/*
 * Read side of the account area. Every function takes the user id of the SESSION (the pages and
 * actions pass `requireUser().id`), and every query filters by it: one user can never read another
 * user's orders or favourites. Names come from `product_translation` for the page locale (null when
 * a product has no translation yet: the caller falls back to the messages and then to the slug).
 */

type Locale = "ru" | "en";

function asLocale(locale: string): Locale {
  return locale === "en" ? "en" : "ru";
}

/** A product as the account screens draw it (tile, thumb, offers banner). */
export type AccountProduct = {
  slug: string;
  name: string | null;
  material: string;
  image: string;
  imageFit: "cover" | "contain";
};

export type AccountOrderItem = AccountProduct & {
  finish: string;
  quantity: number;
  priceCents: number;
  /** Test checkout lines: area in m2 hundredths and the stored line total; null on the seeded demo rows. */
  areaHundredths: number | null;
  lineTotalCents: number | null;
};

export type AccountOrder = {
  number: string;
  /** `test_checkout`: placed through the test shop; `demo`: seeded. */
  kind: "demo" | "test_checkout";
  status: "in_progress" | "delivered";
  totalCents: number;
  createdAt: Date;
  items: AccountOrderItem[];
};

export type AccountOverview = {
  orders: AccountOrder[];
  /** The three latest favourites. */
  favorites: AccountProduct[];
  favoritesTotal: number;
  ordersTotal: number;
  /** Discounted products ("Selected offers"), at most three. */
  offers: AccountProduct[];
};

const productColumns = {
  slug: schema.product.slug,
  material: schema.product.material,
  image: schema.product.image,
  imageFit: schema.product.imageFit,
  name: schema.productTranslation.name,
};

function toProduct(row: {
  slug: string;
  material: string;
  image: string;
  imageFit: string;
  name: string | null;
}): AccountProduct {
  return {
    slug: row.slug,
    name: row.name,
    material: row.material,
    image: row.image,
    imageFit: row.imageFit === "contain" ? "contain" : "cover",
  };
}

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("account queries need a database");
  return db;
}

/** Slugs of the user's favourites (published products only), newest first. */
export async function listFavoriteSlugs(userId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ slug: schema.product.slug })
    .from(schema.favorite)
    .innerJoin(schema.product, eq(schema.favorite.productId, schema.product.id))
    .where(
      and(
        eq(schema.favorite.userId, userId),
        eq(schema.product.published, true),
      ),
    )
    .orderBy(desc(schema.favorite.createdAt), asc(schema.product.slug));
  return rows.map((row) => row.slug);
}

async function loadFavorites(
  db: Db,
  userId: string,
  locale: Locale,
  limit?: number,
): Promise<AccountProduct[]> {
  const query = db
    .select(productColumns)
    .from(schema.favorite)
    .innerJoin(schema.product, eq(schema.favorite.productId, schema.product.id))
    .leftJoin(
      schema.productTranslation,
      and(
        eq(schema.productTranslation.productId, schema.product.id),
        eq(schema.productTranslation.locale, locale),
      ),
    )
    .where(
      and(
        eq(schema.favorite.userId, userId),
        eq(schema.product.published, true),
      ),
    )
    .orderBy(desc(schema.favorite.createdAt), asc(schema.product.slug));
  const rows = await (limit === undefined ? query : query.limit(limit));
  return rows.map(toProduct);
}

export async function listFavorites(
  userId: string,
  locale: string,
): Promise<AccountProduct[]> {
  return loadFavorites(await requireDb(), userId, asLocale(locale));
}

async function loadOrders(
  db: Db,
  userId: string,
  locale: Locale,
  limit?: number,
): Promise<AccountOrder[]> {
  const query = db
    .select()
    .from(schema.order)
    .where(eq(schema.order.userId, userId))
    .orderBy(desc(schema.order.createdAt), desc(schema.order.number));
  const orders = await (limit === undefined ? query : query.limit(limit));
  if (orders.length === 0) return [];

  const items = await db
    .select({
      orderId: schema.orderItem.orderId,
      finish: schema.orderItem.finish,
      quantity: schema.orderItem.quantity,
      priceCents: schema.orderItem.priceCents,
      areaHundredths: schema.orderItem.areaHundredths,
      lineTotalCents: schema.orderItem.lineTotalCents,
      ...productColumns,
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
        eq(schema.productTranslation.locale, locale),
      ),
    )
    .where(
      inArray(
        schema.orderItem.orderId,
        orders.map((order) => order.id),
      ),
    )
    // Test checkout lines in cart order (position); demo rows have none and keep their id order.
    .orderBy(asc(schema.orderItem.position), asc(schema.orderItem.id));

  return orders.map((order) => ({
    number: order.number,
    kind: order.kind === "test_checkout" ? "test_checkout" : "demo",
    status: order.status === "delivered" ? "delivered" : "in_progress",
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        ...toProduct(item),
        finish: item.finish,
        quantity: item.quantity,
        priceCents: item.priceCents,
        areaHundredths: item.areaHundredths,
        lineTotalCents: item.lineTotalCents,
      })),
  }));
}

/** The user's orders, newest first. */
export async function listOrders(
  userId: string,
  locale: string,
): Promise<AccountOrder[]> {
  return loadOrders(await requireDb(), userId, asLocale(locale));
}

/** Everything the Overview screen draws. */
export async function getAccountOverview(
  userId: string,
  locale: string,
): Promise<AccountOverview> {
  const db = await requireDb();
  const lang = asLocale(locale);
  const [orders, favorites, [favoriteCount], [orderCount], offers] =
    await Promise.all([
      loadOrders(db, userId, lang, 2),
      loadFavorites(db, userId, lang, 3),
      db
        .select({ value: count() })
        .from(schema.favorite)
        .innerJoin(
          schema.product,
          eq(schema.favorite.productId, schema.product.id),
        )
        .where(
          and(
            eq(schema.favorite.userId, userId),
            eq(schema.product.published, true),
          ),
        ),
      db
        .select({ value: count() })
        .from(schema.order)
        .where(eq(schema.order.userId, userId)),
      db
        .select(productColumns)
        .from(schema.product)
        .leftJoin(
          schema.productTranslation,
          and(
            eq(schema.productTranslation.productId, schema.product.id),
            eq(schema.productTranslation.locale, lang),
          ),
        )
        .where(
          and(
            eq(schema.product.published, true),
            isNotNull(schema.product.oldPriceCents),
          ),
        )
        .orderBy(asc(schema.product.sortOrder), asc(schema.product.slug))
        .limit(3),
    ]);
  return {
    orders,
    favorites,
    favoritesTotal: favoriteCount?.value ?? 0,
    ordersTotal: orderCount?.value ?? 0,
    offers: offers.map(toProduct),
  };
}
