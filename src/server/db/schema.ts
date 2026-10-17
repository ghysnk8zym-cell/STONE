import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Every timestamp is timestamptz; money is integer cents.
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

/* ------------------------------------------------------------------ */
/* Better Auth tables                                                  */
/*                                                                     */
/* Generated with `auth generate` (Better Auth CLI 1.7.7, Drizzle, pg)  */
/* for emailAndPassword + database rate limiting + a `role` additional  */
/* field, then adjusted to timestamptz and a role check. Keep the table */
/* and column names in sync with the Better Auth config (Task 2): the   */
/* Drizzle adapter maps model names user/session/account/verification/  */
/* rateLimit to the exports below.                                      */
/* ------------------------------------------------------------------ */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    // Sign-up always creates "client"; "admin" exists only through the seed (ADR-002).
    role: text("role").default("client").notNull(),
  },
  (table) => [
    check("user_role_check", sql`${table.role} in ('client', 'admin')`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamptz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Used when Better Auth rate limiting is configured with `storage: "database"`.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const product = pgTable(
  "product",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    material: text("material").notNull(),
    color: text("color").notNull(),
    colorGroup: text("color_group").notNull(),
    finish: text("finish").notNull(),
    /** length x width x thickness, mm */
    format: integer("format").array().notNull(),
    /** price per m2, integer cents */
    priceCents: integer("price_cents").notNull(),
    oldPriceCents: integer("old_price_cents"),
    /** Badge value stored verbatim (not computed from the prices). */
    discountPercent: integer("discount_percent"),
    /** USD 240/m2 is a placeholder until the owner confirms prices (ADR-002). */
    isPlaceholder: boolean("is_placeholder").default(true).notNull(),
    /** Asset manifest key, e.g. `images/catalog/<slug>`. */
    image: text("image").notNull(),
    imageFit: text("image_fit").default("cover").notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("product_format_check", sql`cardinality(${table.format}) = 3`),
    check("product_price_check", sql`${table.priceCents} >= 0`),
    check(
      "product_old_price_check",
      sql`${table.oldPriceCents} is null or ${table.oldPriceCents} >= 0`,
    ),
    check(
      "product_discount_check",
      sql`${table.discountPercent} is null or ${table.discountPercent} between 0 and 100`,
    ),
    check(
      "product_image_fit_check",
      sql`${table.imageFit} in ('cover', 'contain')`,
    ),
    index("product_published_sort_idx").on(table.published, table.sortOrder),
  ],
);

export const productTranslation = pgTable(
  "product_translation",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    check(
      "product_translation_locale_check",
      sql`${table.locale} in ('ru', 'en')`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Account data                                                        */
/* ------------------------------------------------------------------ */

export const favorite = pgTable(
  "favorite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    // A user can favourite a product once.
    primaryKey({ columns: [table.userId, table.productId] }),
    index("favorite_product_idx").on(table.productId),
  ],
);

export const ORDER_STATUSES = ["in_progress", "delivered"] as const;

export const order = pgTable(
  "order",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Human-readable number such as `D-1048`. */
    number: text("number").notNull().unique(),
    // Orders are records: a user with orders cannot be deleted by accident.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status").default("in_progress").notNull(),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "order_status_check",
      sql`${table.status} in ('in_progress', 'delivered')`,
    ),
    check("order_total_check", sql`${table.totalCents} >= 0`),
    index("order_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    finish: text("finish").notNull(),
    quantity: integer("quantity").notNull(),
    /** price per m2 at the time of the order, integer cents */
    priceCents: integer("price_cents").notNull(),
  },
  (table) => [
    check("order_item_quantity_check", sql`${table.quantity} > 0`),
    check("order_item_price_check", sql`${table.priceCents} >= 0`),
    index("order_item_order_idx").on(table.orderId),
    // The restrict FK scans order_item on every product delete without this.
    index("order_item_product_idx").on(table.productId),
  ],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  favorites: many(favorite),
  orders: many(order),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const productRelations = relations(product, ({ many }) => ({
  translations: many(productTranslation),
  favorites: many(favorite),
}));

export const productTranslationRelations = relations(
  productTranslation,
  ({ one }) => ({
    product: one(product, {
      fields: [productTranslation.productId],
      references: [product.id],
    }),
  }),
);

export const favoriteRelations = relations(favorite, ({ one }) => ({
  user: one(user, { fields: [favorite.userId], references: [user.id] }),
  product: one(product, {
    fields: [favorite.productId],
    references: [product.id],
  }),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
  items: many(orderItem),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
}));
