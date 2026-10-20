import "server-only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { OrderStatus } from "@/features/admin/results";

import { getDb, schema, type Db } from "../db";

/*
 * Read side of the admin area. These functions do not check the caller: every admin page and layout
 * calls `requireRole("admin")` first (the guards are the boundary, ADR-002), and nothing here is
 * reachable from a client component or an action argument. Names come from `product_translation`
 * for the page locale, with the slug as the last resort.
 */

type Locale = "ru" | "en";

function asLocale(locale: string): Locale {
  return locale === "en" ? "en" : "ru";
}

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("admin queries need a database");
  return db;
}

/** A product as the admin screens list it. */
export type AdminProduct = {
  slug: string;
  name: string;
  published: boolean;
  material: string;
  priceCents: number;
  oldPriceCents: number | null;
  image: string;
  imageFit: "cover" | "contain";
};

/** A product with everything the edit form needs. */
export type AdminProductDetail = {
  slug: string;
  revision: number;
  published: boolean;
  material: string;
  color: string;
  colorGroup: string;
  finish: string;
  formatMm: [number, number, number];
  priceCents: number;
  oldPriceCents: number | null;
  discountPercent: number | null;
  image: string;
  imageFit: "cover" | "contain";
  names: { ru: string; en: string };
  descriptions: { ru: string; en: string };
};

export type ProductStatusFilter = "all" | "published" | "draft";

function fit(value: string): "cover" | "contain" {
  return value === "contain" ? "contain" : "cover";
}

export async function listAdminProducts(
  locale: string,
  filter: { q?: string; status?: ProductStatusFilter } = {},
): Promise<AdminProduct[]> {
  const db = await requireDb();
  const lang = asLocale(locale);
  const rows = await db
    .select({
      slug: schema.product.slug,
      published: schema.product.published,
      material: schema.product.material,
      priceCents: schema.product.priceCents,
      oldPriceCents: schema.product.oldPriceCents,
      image: schema.product.image,
      imageFit: schema.product.imageFit,
      name: schema.productTranslation.name,
    })
    .from(schema.product)
    .leftJoin(
      schema.productTranslation,
      and(
        eq(schema.productTranslation.productId, schema.product.id),
        eq(schema.productTranslation.locale, lang),
      ),
    )
    .orderBy(asc(schema.product.sortOrder), asc(schema.product.slug));

  const needle = filter.q?.trim().toLocaleLowerCase();
  return rows
    .map((row) => ({
      slug: row.slug,
      name: row.name ?? row.slug,
      published: row.published,
      material: row.material,
      priceCents: row.priceCents,
      oldPriceCents: row.oldPriceCents,
      image: row.image,
      imageFit: fit(row.imageFit),
    }))
    .filter((p) => {
      if (filter.status === "published" && !p.published) return false;
      if (filter.status === "draft" && p.published) return false;
      if (!needle) return true;
      return `${p.name} ${p.slug}`.toLocaleLowerCase().includes(needle);
    });
}

export async function getProductCounts(): Promise<{
  published: number;
  draft: number;
}> {
  const db = await requireDb();
  const rows = await db
    .select({ published: schema.product.published, value: count() })
    .from(schema.product)
    .groupBy(schema.product.published);
  const of = (flag: boolean) =>
    rows.find((row) => row.published === flag)?.value ?? 0;
  return { published: of(true), draft: of(false) };
}

export async function getAdminProduct(
  slug: string,
): Promise<AdminProductDetail | null> {
  const db = await requireDb();
  const ruCopy = alias(schema.productTranslation, "ru_copy");
  const enCopy = alias(schema.productTranslation, "en_copy");
  // Read values, translations and revision from one PostgreSQL snapshot.
  const [found] = await db
    .select({ product: schema.product, ru: ruCopy, en: enCopy })
    .from(schema.product)
    .leftJoin(
      ruCopy,
      and(eq(ruCopy.productId, schema.product.id), eq(ruCopy.locale, "ru")),
    )
    .leftJoin(
      enCopy,
      and(eq(enCopy.productId, schema.product.id), eq(enCopy.locale, "en")),
    )
    .where(eq(schema.product.slug, slug))
    .limit(1);
  if (!found) return null;
  const row = found.product;
  const of = (locale: Locale) => found[locale];
  const [length, width, thickness] = row.format;
  return {
    slug: row.slug,
    revision: row.revision,
    published: row.published,
    material: row.material,
    color: row.color,
    colorGroup: row.colorGroup,
    finish: row.finish,
    formatMm: [length!, width!, thickness!],
    priceCents: row.priceCents,
    oldPriceCents: row.oldPriceCents,
    discountPercent: row.discountPercent,
    image: row.image,
    imageFit: fit(row.imageFit),
    names: { ru: of("ru")?.name ?? "", en: of("en")?.name ?? "" },
    descriptions: {
      ru: of("ru")?.description ?? "",
      en: of("en")?.description ?? "",
    },
  };
}

export type AdminOrderItem = {
  slug: string;
  name: string;
  image: string;
  imageFit: "cover" | "contain";
  finish: string;
  quantity: number;
  priceCents: number;
  /** Test checkout lines: area in m2 hundredths and the stored line total; null on the seeded demo rows. */
  areaHundredths: number | null;
  lineTotalCents: number | null;
};

export type AdminOrder = {
  number: string;
  kind: "demo" | "test_checkout";
  status: OrderStatus;
  totalCents: number;
  createdAt: Date;
  customer: { name: string; email: string };
  items: AdminOrderItem[];
};

function toStatus(status: string): OrderStatus {
  return status === "delivered" ? "delivered" : "in_progress";
}

/** Orders, newest first, optionally scoped to one customer before applying the limit. */
export async function listAdminOrders(
  locale: string,
  userId?: string,
): Promise<AdminOrder[]> {
  const db = await requireDb();
  const lang = asLocale(locale);
  const orders = await db
    .select({
      id: schema.order.id,
      number: schema.order.number,
      status: schema.order.status,
      totalCents: schema.order.totalCents,
      createdAt: schema.order.createdAt,
      kind: schema.order.kind,
      customerName: schema.user.name,
      customerEmail: schema.user.email,
    })
    .from(schema.order)
    .innerJoin(schema.user, eq(schema.order.userId, schema.user.id))
    .where(userId === undefined ? undefined : eq(schema.order.userId, userId))
    .orderBy(desc(schema.order.createdAt), desc(schema.order.number))
    .limit(500);
  if (orders.length === 0) return [];

  const items = await db
    .select({
      orderId: schema.orderItem.orderId,
      finish: schema.orderItem.finish,
      quantity: schema.orderItem.quantity,
      priceCents: schema.orderItem.priceCents,
      areaHundredths: schema.orderItem.areaHundredths,
      lineTotalCents: schema.orderItem.lineTotalCents,
      slug: schema.product.slug,
      image: schema.product.image,
      imageFit: schema.product.imageFit,
      name: schema.productTranslation.name,
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
    status: toStatus(order.status),
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    customer: { name: order.customerName, email: order.customerEmail },
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        slug: item.slug,
        name: item.name ?? item.slug,
        image: item.image,
        imageFit: fit(item.imageFit),
        finish: item.finish,
        quantity: item.quantity,
        priceCents: item.priceCents,
        areaHundredths: item.areaHundredths,
        lineTotalCents: item.lineTotalCents,
      })),
  }));
}

export type AdminOverview = {
  revenueCents: number;
  orders: number;
  published: number;
  /** Revenue of the last seven days that have orders (the newest order's day last), oldest first. */
  days: { date: Date; revenueCents: number }[];
  products: AdminProduct[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dayStart(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS) * DAY_MS;
}

/** Figures of the Overview screen, all from the database. */
export async function getAdminOverview(locale: string): Promise<AdminOverview> {
  const db = await requireDb();
  const [[totals], counts, orders, products] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${schema.order.totalCents}), 0)::int`,
        orders: count(),
      })
      .from(schema.order),
    getProductCounts(),
    db
      .select({
        createdAt: schema.order.createdAt,
        totalCents: schema.order.totalCents,
      })
      .from(schema.order)
      .orderBy(desc(schema.order.createdAt))
      .limit(500),
    listAdminProducts(locale, { status: "published" }),
  ]);

  // The chart ends on the day of the newest order, so a demo database that is a few days old
  // still draws something; without any order it is empty.
  const newest = orders[0];
  const days: AdminOverview["days"] = [];
  if (newest) {
    const last = dayStart(newest.createdAt);
    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = last - offset * DAY_MS;
      days.push({
        date: new Date(start),
        revenueCents: orders
          .filter((o) => dayStart(o.createdAt) === start)
          .reduce((sum, o) => sum + o.totalCents, 0),
      });
    }
  }

  return {
    revenueCents: totals?.revenue ?? 0,
    orders: totals?.orders ?? 0,
    published: counts.published,
    days,
    products: products.slice(0, 3),
  };
}
