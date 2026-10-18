import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray, sql } from "drizzle-orm";

import { seed as staticProducts } from "../catalog/seed";
import type { Db } from "./client";
import * as schema from "./schema";

/*
 * The idempotent seed behind `pnpm db:seed`. Every step inserts by a natural key (product slug,
 * user email, order number, favourite pair) and does nothing when the row exists, so running it
 * again changes nothing and never overwrites data an admin has edited (prices, publishing, names).
 *
 * Steps: catalog (12 products + ru/en translations) -> users -> demo account data for the Client.
 * Users are created by an injected `createUser`, because passwords must go through Better Auth's
 * hashing (src/server/auth/auth.ts). Without it, an existing user is still found by email and gets
 * the demo orders and favourites; a missing one is skipped. Emails are lowercased first, as Better
 * Auth stores them. An existing account is made an admin only if it already holds the admin password.
 */

const LOCALES = ["ru", "en"] as const;

type Messages = {
  catalog: { products: Record<string, { name: string; description: string }> };
};

/** Copy stays single-sourced: product names and descriptions are read from messages/*.json. */
function readMessages(locale: string): Messages {
  const file = join(process.cwd(), "messages", `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Messages;
}

export type SeedCounts = {
  products: number;
  translations: number;
  users: number;
  orders: number;
  orderItems: number;
  favorites: number;
};

export async function seedCatalog(
  db: Db,
): Promise<Pick<SeedCounts, "products" | "translations">> {
  const copy = Object.fromEntries(
    LOCALES.map((locale) => [locale, readMessages(locale).catalog.products]),
  );

  let translations = 0;
  for (const [index, p] of staticProducts.entries()) {
    const values = {
      slug: p.slug,
      material: p.material,
      color: p.color,
      colorGroup: p.colorGroup,
      finish: p.finish,
      format: [...p.formatMm],
      priceCents: p.priceCents,
      oldPriceCents: p.oldPriceCents ?? null,
      discountPercent: p.discountPercent ?? null,
      isPlaceholder: p.isPlaceholder,
      image: p.image,
      imageFit: p.imageFit,
      published: true,
      sortOrder: index,
    };
    // Admin-managed data is never overwritten: an existing slug is left exactly as it is.
    await db.insert(schema.product).values(values).onConflictDoNothing();
    const [row] = await db
      .select({ id: schema.product.id })
      .from(schema.product)
      .where(eq(schema.product.slug, p.slug));

    for (const locale of LOCALES) {
      const entry = copy[locale]?.[p.slug];
      if (!entry) {
        throw new Error(
          `messages/${locale}.json has no catalog.products.${p.slug}`,
        );
      }
      const translation = {
        productId: row!.id,
        locale,
        name: entry.name,
        description: entry.description,
      };
      await db
        .insert(schema.productTranslation)
        .values(translation)
        .onConflictDoNothing();
      translations += 1;
    }
  }
  return { products: staticProducts.length, translations };
}

// Demo account data, Figma Account (736:5318). The totals are copied from Figma as drawn: the
// Grey Limestone order shows $384, which is not price x quantity at the catalog price.
// Order dates are not shown in the design; these are placeholders.
const DEMO_ORDERS = [
  {
    number: "D-1048",
    status: "in_progress",
    totalCents: 24000,
    createdAt: new Date("2026-10-05T09:00:00Z"),
    items: [{ slug: "black-marble", finish: "polished", quantity: 1 }],
  },
  {
    number: "D-1032",
    status: "delivered",
    totalCents: 38400,
    createdAt: new Date("2026-09-12T09:00:00Z"),
    items: [{ slug: "grey-limestone", finish: "honed", quantity: 2 }],
  },
] as const;

const DEMO_FAVORITES = ["black-marble", "grey-limestone", "grey-marble"];

/** Orders and favourites for the user with this email; nothing happens when the user does not exist. */
export async function seedAccountData(
  db: Db,
  clientEmail: string,
): Promise<Pick<SeedCounts, "orders" | "orderItems" | "favorites">> {
  const none = { orders: 0, orderItems: 0, favorites: 0 };
  const [client] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, clientEmail));
  if (!client) return none;

  const slugs = [
    ...new Set([
      ...DEMO_FAVORITES,
      ...DEMO_ORDERS.flatMap((o) => o.items.map((i) => i.slug)),
    ]),
  ];
  const products = await db
    .select({
      id: schema.product.id,
      slug: schema.product.slug,
      priceCents: schema.product.priceCents,
    })
    .from(schema.product)
    .where(inArray(schema.product.slug, slugs));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const productOf = (slug: string) => {
    const p = bySlug.get(slug);
    if (!p)
      throw new Error(
        `seed: product ${slug} is missing, seed the catalog first`,
      );
    return p;
  };

  let orderItems = 0;
  for (const demo of DEMO_ORDERS) {
    const values = {
      number: demo.number,
      userId: client.id,
      status: demo.status,
      totalCents: demo.totalCents,
      createdAt: demo.createdAt,
    };
    await db.insert(schema.order).values(values).onConflictDoNothing();
    const [order] = await db
      .select({ id: schema.order.id })
      .from(schema.order)
      .where(eq(schema.order.number, demo.number));

    // Items are added only to an order that has none (a half-finished earlier run heals itself).
    const [existingItem] = await db
      .select({ id: schema.orderItem.id })
      .from(schema.orderItem)
      .where(eq(schema.orderItem.orderId, order!.id))
      .limit(1);
    if (existingItem) {
      orderItems += demo.items.length;
      continue;
    }
    for (const item of demo.items) {
      const product = productOf(item.slug);
      await db.insert(schema.orderItem).values({
        orderId: order!.id,
        productId: product.id,
        finish: item.finish,
        quantity: item.quantity,
        priceCents: product.priceCents,
      });
      orderItems += 1;
    }
  }

  // The account screens list favourites newest first; Figma shows Black Marble, Grey Limestone, Grey Marble,
  // so the first slug is the newest.
  const now = Date.now();
  for (const [index, slug] of DEMO_FAVORITES.entries()) {
    await db
      .insert(schema.favorite)
      .values({
        userId: client.id,
        productId: productOf(slug).id,
        createdAt: new Date(now - index * 60_000),
      })
      .onConflictDoNothing();
  }

  return {
    orders: DEMO_ORDERS.length,
    orderItems,
    favorites: DEMO_FAVORITES.length,
  };
}

export type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: "admin" | "client";
};

export type SeedOptions = {
  adminEmail: string;
  adminPassword: string;
  clientEmail: string;
  clientPassword: string;
  /** Creates a user with a hashed password (Better Auth). Called only for emails not yet in the database. */
  createUser?: (user: SeedUser) => Promise<void>;
  /** True when the stored credential of `email` matches `password` (Better Auth's password verify). */
  verifyPassword?: (email: string, password: string) => Promise<boolean>;
};

/**
 * The seed refused to change the database. The message names variables only, never emails or
 * passwords, so the seed script can print it as is.
 */
export class SeedRefusalError extends Error {
  override name = "SeedRefusalError";
}

/** Better Auth stores emails lowercased; the seed compares and writes the same form. */
export function normalizeSeedEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUser(db: Db, email: string) {
  const [row] = await db
    .select({ id: schema.user.id, role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.email, email));
  return row;
}

async function ensureUser(db: Db, user: SeedUser, options: SeedOptions) {
  const existing = await findUser(db, user.email);
  if (!existing) {
    if (!options.createUser) return; // nothing to create users with: skipped
    await options.createUser(user);
  }
  // Sign-up always creates a client; the Admin exists only through the seed (ADR-002).
  if (user.role !== "admin" || existing?.role === "admin") return;

  // An account with the admin email that the seed did not just create may belong to anyone who
  // signed up first with that (guessable) email. Promote it only when it holds the admin password.
  if (existing) {
    const verified =
      (await options.verifyPassword?.(user.email, user.password)) ?? false;
    if (!verified) {
      throw new SeedRefusalError(
        "an account with SEED_ADMIN_EMAIL already exists and its password is not SEED_ADMIN_PASSWORD; " +
          "refusing to make it an admin. Delete that account or choose another SEED_ADMIN_EMAIL",
      );
    }
  }
  await db
    .update(schema.user)
    .set({ role: "admin" })
    .where(eq(schema.user.email, user.email));
}

export async function seed(db: Db, options: SeedOptions): Promise<SeedCounts> {
  const adminEmail = normalizeSeedEmail(options.adminEmail);
  const clientEmail = normalizeSeedEmail(options.clientEmail);
  const catalog = await seedCatalog(db);

  await ensureUser(
    db,
    {
      email: adminEmail,
      password: options.adminPassword,
      name: "STONE Admin",
      role: "admin",
    },
    options,
  );
  await ensureUser(
    db,
    {
      email: clientEmail,
      password: options.clientPassword,
      name: "STONE Client",
      role: "client",
    },
    options,
  );

  const account = await seedAccountData(db, clientEmail);
  const [{ users }] = await db
    .select({ users: sql<number>`count(*)::int` })
    .from(schema.user)
    .where(inArray(schema.user.email, [adminEmail, clientEmail]));

  return { ...catalog, users: users ?? 0, ...account };
}

/** One line of counts for the seed script. Never includes emails, passwords or URLs. */
export function formatSeedSummary(counts: SeedCounts): string {
  return Object.entries(counts)
    .map(([name, value]) => `${name}: ${value}`)
    .join(", ");
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** True for pglite:// and for a postgres URL on this machine; false for anything else, or an unparsable URL. */
export function isLocalDatabaseUrl(url: string): boolean {
  if (url.startsWith("pglite://")) return true;
  try {
    const parsed = new URL(url);
    return (
      /^postgres(ql)?:$/.test(parsed.protocol) &&
      LOCAL_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/** The shortest admin password the seed accepts for a remote (shared, internet-reachable) database. */
export const REMOTE_ADMIN_PASSWORD_MIN = 16;

/**
 * The seed refuses a remote database unless SEED_ALLOW_REMOTE=1, and then only with an admin password of at least
 * REMOTE_ADMIN_PASSWORD_MIN characters (the admin account of a preview is reachable by anyone with the address).
 * Returns the refusal message (naming variables only, never the URL, which holds credentials, nor the password) or
 * null when it may run. Local and throwaway databases keep their short test passwords.
 */
export function seedTargetRefusal(
  databaseUrl: string,
  allowRemote: string | undefined,
  adminPassword?: string,
): string | null {
  if (isLocalDatabaseUrl(databaseUrl)) return null;
  if (allowRemote !== "1") {
    return "DATABASE_URL points to a remote database; set SEED_ALLOW_REMOTE=1 to seed it anyway";
  }
  if ((adminPassword ?? "").length < REMOTE_ADMIN_PASSWORD_MIN) {
    return `a remote database needs SEED_ADMIN_PASSWORD of at least ${REMOTE_ADMIN_PASSWORD_MIN} characters`;
  }
  return null;
}
