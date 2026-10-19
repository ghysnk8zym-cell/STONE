"use server";

import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  OrderActionResult,
  ProductActionResult,
  PromotionResult,
  PublishActionResult,
} from "@/features/admin/results";
import { routing } from "@/i18n/routing";
import { requireRole } from "@/server/auth/guards";
import { requestLocale } from "@/server/auth/request-locale";

import { getDb, schema, type Db } from "../db";
import { writeAtomically } from "../db/atomic";
import { imageFitFor } from "./images";
import {
  createProductSchema,
  failedFields,
  ORDER_NUMBER,
  productInputSchema,
  promotionInputSchema,
  promotionSnapshotSchema,
  revisionSchema,
  slugSchema,
  type ProductInput,
} from "./product-input";

/*
 * Admin server actions (Phase 4a Task 5). Every action calls `requireRole("admin")` FIRST, before it
 * reads or validates anything: a Client or a Guest calling one directly (bypassing the UI) is turned
 * away by the guard (404 for a Client, sign-in for a Guest). Arguments are `unknown` and validated
 * with zod: a server action is a public POST endpoint whatever the form sends. Money is integer cents,
 * the picture must be a manifest catalog image, texts are plain text. Results are codes only
 * (src/features/admin/results.ts).
 *
 * After a product changes, invalidate the affected client navigation entries as well as server caches.
 * Home, product pages and catalog read per request; concrete locale paths still refresh clients that visited them.
 * Also refresh the account area (names in orders and favourites) and the admin screens.
 */

function refreshCatalog() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/catalog`);
  }
  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/catalog/[slug]", "page");
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/[locale]/admin", "layout");
}

function productValues(input: ProductInput) {
  return {
    material: input.material,
    color: input.color,
    colorGroup: input.colorGroup,
    finish: input.finish,
    format: [input.lengthMm, input.widthMm, input.thicknessMm],
    priceCents: input.priceCents,
    oldPriceCents: input.oldPriceCents,
    discountPercent: input.discountPercent,
    image: input.image,
    imageFit: imageFitFor(input.image),
    published: input.published,
  };
}

/** The upserts of the ru and en copy, as statements for `writeAtomically`. */
function translationStatements(db: Db, productId: string, input: ProductInput) {
  const rows = [
    { locale: "ru", name: input.nameRu, description: input.descriptionRu },
    { locale: "en", name: input.nameEn, description: input.descriptionEn },
  ];
  return rows.map((row) =>
    db
      .insert(schema.productTranslation)
      .values({ productId, ...row })
      .onConflictDoUpdate({
        target: [
          schema.productTranslation.productId,
          schema.productTranslation.locale,
        ],
        set: { name: row.name, description: row.description },
      }),
  );
}

/** PostgreSQL unique_violation, as every driver reports it (also through Drizzle's wrapper error). */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current; depth += 1) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** Creates a product with its ru and en copy. The slug is the public URL and cannot change later. */
export async function createProduct(
  input: unknown,
): Promise<ProductActionResult> {
  await requireRole("admin", await requestLocale());
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", fields: failedFields(parsed.error) };
  }
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };

  const { slug, ...fields } = parsed.data;
  const [taken] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(eq(schema.product.slug, slug))
    .limit(1);
  if (taken) return { ok: false, code: "slug-taken", fields: ["slug"] };

  const [last] = await db
    .select({ sortOrder: schema.product.sortOrder })
    .from(schema.product)
    .orderBy(desc(schema.product.sortOrder))
    .limit(1);

  // The id is made here so the product and its two translations go in as one atomic write: no product
  // without a name, and no cleanup step that could itself fail.
  const productId = crypto.randomUUID();
  try {
    await writeAtomically(db, (database) => [
      database.insert(schema.product).values({
        id: productId,
        slug,
        ...productValues(fields),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      }),
      ...translationStatements(database, productId, fields),
    ]);
  } catch (error) {
    // Two admins creating the same slug at once: the unique index decides.
    if (isUniqueViolation(error)) {
      return { ok: false, code: "slug-taken", fields: ["slug"] };
    }
    throw error;
  }
  refreshCatalog();
  return { ok: true, slug };
}

/** Saves the fields and the ru / en copy of an existing product. */
export async function updateProduct(
  slug: unknown,
  input: unknown,
  expectedRevision?: unknown,
): Promise<ProductActionResult> {
  await requireRole("admin", await requestLocale());
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) return { ok: false, code: "not-found" };
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", fields: failedFields(parsed.error) };
  }
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };

  const revision = revisionSchema.safeParse(expectedRevision);
  if (!revision.success) return { ok: false, code: "invalid" };
  const p = parsed.data;
  // One statement works on Neon HTTP as well as pg/PGlite. Only the winning UPDATE
  // supplies IDs to the copy upsert; a conflict or failed translation writes nothing.
  const result = await db.execute<{ slug: string; revision: number }>(sql`
    with updated as (
      update ${schema.product} set
        material=${p.material}, color=${p.color}, color_group=${p.colorGroup}, finish=${p.finish},
        format=array[${p.lengthMm},${p.widthMm},${p.thicknessMm}]::integer[],
        price_cents=${p.priceCents}, old_price_cents=${p.oldPriceCents}, discount_percent=${p.discountPercent},
        image=${p.image}, image_fit=${imageFitFor(p.image)}, published=${p.published},
        revision=revision+1, updated_at=now()
      where slug=${parsedSlug.data} and revision=${revision.data} and revision<2147483647
      returning id, slug, revision
    ), copied as (
      insert into ${schema.productTranslation} (product_id, locale, name, description)
      select updated.id, copy.locale, copy.name, copy.description from updated
      cross join (values ('ru',${p.nameRu},${p.descriptionRu}),('en',${p.nameEn},${p.descriptionEn})) as copy(locale,name,description)
      where true
      on conflict (product_id,locale) do update set name=excluded.name, description=excluded.description
      returning product_id
    ) select slug, revision from updated
  `);
  // The three supported PostgreSQL adapters return a result envelope with rows.
  if (!(result as { rows: { slug: string; revision: number }[] }).rows.length)
    return productConflict(db, parsedSlug.data);
  refreshCatalog();
  return { ok: true, slug: parsedSlug.data };
}

/** Publishes or unpublishes a product: an unpublished one is gone from the grid and its page is a 404. */
export async function setProductPublished(
  slug: unknown,
  published: unknown,
  expectedRevision?: unknown,
): Promise<PublishActionResult> {
  await requireRole("admin", await requestLocale());
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success || typeof published !== "boolean") {
    return { ok: false, code: "invalid" };
  }
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  const revision = revisionSchema.safeParse(expectedRevision);
  if (!revision.success) return { ok: false, code: "invalid" };

  const updated = await db
    .update(schema.product)
    .set({ published, revision: sql`${schema.product.revision} + 1` })
    .where(
      and(
        eq(schema.product.slug, parsedSlug.data),
        eq(schema.product.revision, revision.data),
        lt(schema.product.revision, 2147483647),
      ),
    )
    .returning({ id: schema.product.id });
  if (updated.length === 0) return productConflict(db, parsedSlug.data);
  refreshCatalog();
  return { ok: true, published };
}

const statusSchema = z.enum(schema.ORDER_STATUSES);

async function productConflict(
  db: Db,
  slug: string,
): Promise<{ ok: false; code: "conflict" | "not-found" }> {
  const [existing] = await db
    .select({ slug: schema.product.slug })
    .from(schema.product)
    .where(eq(schema.product.slug, slug))
    .limit(1);
  return { ok: false, code: existing ? "conflict" : "not-found" };
}

/** Updates only the product's price fields, refusing a stale Promotions form atomically. */
export async function setProductPromotion(
  slug: unknown,
  input: unknown,
  expected: unknown,
): Promise<PromotionResult> {
  await requireRole("admin", await requestLocale());
  const parsedSlug = slugSchema.safeParse(slug);
  const parsed = promotionInputSchema.safeParse(input);
  const previous = promotionSnapshotSchema.safeParse(expected);
  if (!parsedSlug.success || !parsed.success || !previous.success) {
    return {
      ok: false,
      code: "invalid",
      ...(!parsed.success ? { fields: failedFields(parsed.error) } : {}),
    };
  }
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  const before = previous.data;
  const [updated] = await db
    .update(schema.product)
    .set({ ...parsed.data, revision: sql`${schema.product.revision} + 1` })
    .where(
      and(
        eq(schema.product.slug, parsedSlug.data),
        eq(schema.product.revision, before.revision),
        lt(schema.product.revision, 2147483647),
        eq(schema.product.priceCents, before.priceCents),
        before.oldPriceCents === null
          ? isNull(schema.product.oldPriceCents)
          : eq(schema.product.oldPriceCents, before.oldPriceCents),
        before.discountPercent === null
          ? isNull(schema.product.discountPercent)
          : eq(schema.product.discountPercent, before.discountPercent),
      ),
    )
    .returning({ revision: schema.product.revision });
  if (!updated) {
    const [existing] = await db
      .select({ slug: schema.product.slug })
      .from(schema.product)
      .where(eq(schema.product.slug, parsedSlug.data))
      .limit(1);
    return { ok: false, code: existing ? "conflict" : "not-found" };
  }
  refreshCatalog();
  return { ok: true, prices: { ...parsed.data, revision: updated.revision } };
}

/**
 * Changes the status of an order; the Client sees it in their Orders. The rule: an admin may move an order freely
 * between the two statuses (in progress and delivered, either way: a mistaken "delivered" must be undoable); there
 * is no other state and no history yet. Only the enum values pass.
 */
export async function setOrderStatus(
  number: unknown,
  status: unknown,
): Promise<OrderActionResult> {
  await requireRole("admin", await requestLocale());
  const parsedNumber = z.string().regex(ORDER_NUMBER).safeParse(number);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedNumber.success || !parsedStatus.success) {
    return { ok: false, code: "invalid" };
  }
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };

  const updated = await db
    .update(schema.order)
    .set({ status: parsedStatus.data })
    .where(eq(schema.order.number, parsedNumber.data))
    .returning({ number: schema.order.number });
  if (updated.length === 0) return { ok: false, code: "not-found" };
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, status: parsedStatus.data };
}
