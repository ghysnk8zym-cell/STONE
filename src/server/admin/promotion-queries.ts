import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { PromotionSnapshot } from "@/features/admin/results";
import { requireRole } from "@/server/auth/guards";

import { getDb, schema } from "../db";

export type PromotionProduct = PromotionSnapshot & {
  slug: string;
  name: string;
  material: string;
  formatMm: [number, number, number];
  image: string;
  imageFit: "cover" | "contain";
  published: boolean;
};

/** The small catalog, including drafts; no campaign or scheduling state is invented. */
export async function getPromotionProducts(
  locale: string,
): Promise<PromotionProduct[]> {
  await requireRole("admin", locale);
  const db = await getDb();
  if (!db) throw new Error("admin queries need a database");
  const rows = await db
    .select({
      slug: schema.product.slug,
      name: schema.productTranslation.name,
      material: schema.product.material,
      formatMm: schema.product.format,
      image: schema.product.image,
      imageFit: schema.product.imageFit,
      published: schema.product.published,
      revision: schema.product.revision,
      priceCents: schema.product.priceCents,
      oldPriceCents: schema.product.oldPriceCents,
      discountPercent: schema.product.discountPercent,
    })
    .from(schema.product)
    .leftJoin(
      schema.productTranslation,
      and(
        eq(schema.productTranslation.productId, schema.product.id),
        eq(schema.productTranslation.locale, locale === "en" ? "en" : "ru"),
      ),
    )
    .orderBy(asc(schema.product.sortOrder), asc(schema.product.slug));
  return rows.map((row) => ({
    ...row,
    name: row.name?.trim() || row.slug,
    imageFit: row.imageFit === "contain" ? "contain" : "cover",
    formatMm: [row.formatMm[0]!, row.formatMm[1]!, row.formatMm[2]!],
  }));
}
