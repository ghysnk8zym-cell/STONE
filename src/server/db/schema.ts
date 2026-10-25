import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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
    // Sign-up always creates "client"; the seed and guarded Customers action can grant "admin".
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
    /** Ordered real photos; first entry is the card/main image. Empty for legacy assets. */
    gallery: text("gallery")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    imageFit: text("image_fit").default("cover").notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    /** Optimistic edit token shared by Product, Promotions and publication actions. */
    revision: integer("revision").default(0).notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("product_format_check", sql`cardinality(${table.format}) = 3`),
    check("product_revision_check", sql`${table.revision} >= 0`),
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

/** Uploaded files live in object storage; only immutable metadata lives in PostgreSQL. */
export const productMedia = pgTable("product_media", {
  id: uuid("id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamptz("created_at").defaultNow().notNull(),
});

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

/** Fixed home text overrides. Missing rows use the locale's messages. */
export const siteContent = pgTable(
  "site_content",
  {
    key: text("key").notNull(),
    locale: text("locale").notNull(),
    text: text("text").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.locale] }),
    check("site_content_locale_check", sql`${table.locale} in ('ru', 'en')`),
    check(
      "site_content_text_check",
      sql`char_length(${table.text}) between 1 and 200`,
    ),
  ],
);

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
/** `demo`: seeded rows; `test_checkout`: placed through the test shop checkout (no payment, no delivery). */
export const ORDER_KINDS = ["demo", "test_checkout"] as const;

/** Numbers of test checkout orders: `T-2001`, `T-2002`, ... */
export const orderNumber = pgSequence("order_number_seq", {
  startWith: 2001,
  maxValue: 999999999,
  cycle: false,
});

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
    kind: text("kind").default("demo").notNull(),
    /** Client-generated per checkout attempt; a retry with the same key returns the same order. */
    idempotencyKey: uuid("idempotency_key"),
    /** sha256 of the normalised cart of that attempt (same key + other content = conflict). */
    submissionDigest: text("submission_digest"),
  },
  (table) => [
    check(
      "order_status_check",
      sql`${table.status} in ('in_progress', 'delivered')`,
    ),
    check("order_total_check", sql`${table.totalCents} >= 0`),
    check("order_kind_check", sql`${table.kind} in ('demo', 'test_checkout')`),
    index("order_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("order_user_idempotency_idx")
      .on(table.userId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
  ],
);

/** Immutable specifications, with an editable per-piece quote and tracking status. */
export const stoneRequestNumber = pgSequence("stone_request_number_seq", {
  startWith: 100000000,
  maxValue: 999999999,
  cycle: false,
});

/** One row serializes the small, lifetime-bounded demo upload budget. */
export const stoneRequestBudget = pgTable(
  "stone_request_budget",
  {
    id: integer("id").primaryKey(),
    total: integer("total").default(0).notNull(),
    users: jsonb("users").$type<Record<string, number>>().default({}).notNull(),
  },
  (table) => [
    check(
      "stone_request_budget_check",
      sql`${table.id} = 1 and ${table.total} between 0 and 50`,
    ),
  ],
);

export const stoneRequest = pgTable(
  "stone_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: text("number")
      .default(sql`'Q-' || nextval('stone_request_number_seq')`)
      .notNull()
      .unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    nameEn: text("name_en").notNull(),
    nameRu: text("name_ru").notNull(),
    material: text("material").notNull(),
    color: text("color").notNull(),
    finish: text("finish").notNull(),
    lengthMm: integer("length_mm").notNull(),
    widthMm: integer("width_mm").notNull(),
    thicknessMm: integer("thickness_mm").notNull(),
    quantity: integer("quantity").notNull(),
    referenceImage: text("reference_image"),
    photoBase64: text("photo_base64"),
    submissionKey: uuid("submission_key"),
    submissionDigest: text("submission_digest"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    quoteUnitPriceCents: integer("quote_unit_price_cents"),
    status: text("status").default("new").notNull(),
    revision: integer("revision").default(0).notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "stone_request_number_check",
      sql`${table.number} ~ '^Q-[0-9]{3,9}$'`,
    ),
    check(
      "stone_request_status_check",
      sql`${table.status} in ('new', 'draft_quote', 'awaiting_payment')`,
    ),
    check(
      "stone_request_quote_check",
      sql`${table.quoteUnitPriceCents} is null or ${table.quoteUnitPriceCents} between 0 and 10000000`,
    ),
    check(
      "stone_request_status_quote_check",
      sql`${table.status} = 'new' or ${table.quoteUnitPriceCents} is not null`,
    ),
    check(
      "stone_request_dimensions_check",
      sql`${table.lengthMm} between 1 and 10000 and ${table.widthMm} between 1 and 10000 and ${table.thicknessMm} between 1 and 10000`,
    ),
    check(
      "stone_request_quantity_check",
      sql`${table.quantity} between 1 and 10000`,
    ),
    check("stone_request_revision_check", sql`${table.revision} >= 0`),
    check(
      "stone_request_submission_check",
      sql`(${table.submissionKey} is null and ${table.submissionDigest} is null and ${table.photoBase64} is null and ${table.contactName} is null and ${table.contactEmail} is null and ${table.contactPhone} is null) or (${table.submissionKey} is not null and ${table.submissionDigest} is not null and ${table.photoBase64} is not null and length(${table.photoBase64}) between 1 and 699052 and ${table.contactName} is not null and ${table.contactEmail} is not null and ${table.contactPhone} is not null)`,
    ),
    index("stone_request_user_idx").on(table.userId),
    uniqueIndex("stone_request_submission_idx").on(
      table.userId,
      table.submissionKey,
    ),
    index("stone_request_created_idx").on(table.createdAt, table.number),
    index("stone_request_status_created_idx").on(table.status, table.createdAt),
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
    /** Test checkout lines: the ordered area in m2 hundredths (quantity is then 1). Null on demo rows. */
    areaHundredths: integer("area_hundredths"),
    /** Test checkout lines: round(area hundredths x price / 100), stored as charged. */
    lineTotalCents: integer("line_total_cents"),
    /** Test checkout lines: 0-based position in the cart, so the order lists them as the customer did. */
    position: integer("position"),
  },
  (table) => [
    check("order_item_quantity_check", sql`${table.quantity} > 0`),
    check("order_item_price_check", sql`${table.priceCents} >= 0`),
    check(
      "order_item_area_check",
      sql`${table.areaHundredths} is null or ${table.areaHundredths} between 1 and 1000000`,
    ),
    check(
      "order_item_line_total_check",
      sql`${table.lineTotalCents} is null or ${table.lineTotalCents} >= 0`,
    ),
    check(
      "order_item_position_check",
      sql`${table.position} is null or ${table.position} between 0 and 99`,
    ),
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
  stoneRequests: many(stoneRequest),
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

export const stoneRequestRelations = relations(stoneRequest, ({ one }) => ({
  user: one(user, { fields: [stoneRequest.userId], references: [user.id] }),
}));
