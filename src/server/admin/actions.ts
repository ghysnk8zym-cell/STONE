"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  OrderActionResult,
  ProductActionResult,
  PublishActionResult,
} from "@/features/admin/results";
import { requireRole } from "@/server/auth/guards";
import { requestLocale } from "@/server/auth/request-locale";

import { getDb, schema, type Db } from "../db";
import { imageFitFor } from "./images";
import {
  createProductSchema,
  failedFields,
  ORDER_NUMBER,
  productInputSchema,
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
 * After a product changes, the pages that show it are revalidated: product pages (ISR), the catalog,
 * the home page (carousels), the account area (names in orders and favourites) and the admin screens.
 */

function refreshCatalog() {
  revalidatePath("/[locale]/catalog/[slug]", "page");
  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]", "page");
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

async function saveTranslations(
  db: Db,
  productId: string,
  input: ProductInput,
) {
  const rows = [
    { locale: "ru", name: input.nameRu, description: input.descriptionRu },
    { locale: "en", name: input.nameEn, description: input.descriptionEn },
  ];
  for (const row of rows) {
    await db
      .insert(schema.productTranslation)
      .values({ productId, ...row })
      .onConflictDoUpdate({
        target: [
          schema.productTranslation.productId,
          schema.productTranslation.locale,
        ],
        set: { name: row.name, description: row.description },
      });
  }
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

  let productId: string;
  try {
    const [created] = await db
      .insert(schema.product)
      .values({
        slug,
        ...productValues(fields),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      })
      .returning({ id: schema.product.id });
    productId = created!.id;
  } catch (error) {
    // Two admins creating the same slug at once: the unique index decides.
    if (isUniqueViolation(error)) {
      return { ok: false, code: "slug-taken", fields: ["slug"] };
    }
    throw error;
  }

  try {
    await saveTranslations(db, productId, fields);
  } catch (error) {
    // No half-made product (it would be listed without a name): remove it and report the failure.
    await db.delete(schema.product).where(eq(schema.product.id, productId));
    throw error;
  }
  refreshCatalog();
  return { ok: true, slug };
}

/** Saves the fields and the ru / en copy of an existing product. */
export async function updateProduct(
  slug: unknown,
  input: unknown,
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

  const [product] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(eq(schema.product.slug, parsedSlug.data))
    .limit(1);
  if (!product) return { ok: false, code: "not-found" };

  await db
    .update(schema.product)
    .set(productValues(parsed.data))
    .where(eq(schema.product.id, product.id));
  await saveTranslations(db, product.id, parsed.data);
  refreshCatalog();
  return { ok: true, slug: parsedSlug.data };
}

/** Publishes or unpublishes a product: an unpublished one is gone from the grid and its page is a 404. */
export async function setProductPublished(
  slug: unknown,
  published: unknown,
): Promise<PublishActionResult> {
  await requireRole("admin", await requestLocale());
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success || typeof published !== "boolean") {
    return { ok: false, code: "invalid" };
  }
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };

  const updated = await db
    .update(schema.product)
    .set({ published })
    .where(eq(schema.product.slug, parsedSlug.data))
    .returning({ id: schema.product.id });
  if (updated.length === 0) return { ok: false, code: "not-found" };
  refreshCatalog();
  return { ok: true, published };
}

const statusSchema = z.enum(schema.ORDER_STATUSES);

/** Changes the status of an order; the Client sees it in their Orders. */
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
