import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { Db } from "../db";
import { schema } from "../db";
import { createStaticRepository } from "./static-repository";
import type {
  CatalogRepository,
  Color,
  ColorGroup,
  Finish,
  Material,
  Product,
} from "./types";

function toProduct(row: typeof schema.product.$inferSelect): Product {
  const [length, width, thickness] = row.format;
  const product: Product = {
    slug: row.slug,
    material: row.material as Material,
    color: row.color as Color,
    colorGroup: row.colorGroup as ColorGroup,
    finish: row.finish as Finish,
    formatMm: [length!, width!, thickness!],
    priceCents: row.priceCents,
    // The Product type only models placeholder prices; every price is one until the owner
    // confirms them (ADR-002). The column exists so 4b can flip it per product.
    isPlaceholder: true,
    image: row.image,
    imageFit: row.imageFit as Product["imageFit"],
  };
  if (row.oldPriceCents !== null) product.oldPriceCents = row.oldPriceCents;
  if (row.discountPercent !== null) {
    product.discountPercent = row.discountPercent;
  }
  return product;
}

const published = eq(schema.product.published, true);

/**
 * CatalogRepository over the `product` table. Only published products are visible.
 *
 * The catalog is small, so the filtering, search and sorting rules are not duplicated in SQL:
 * the published rows are loaded in `sort_order` and handed to the static repository's
 * implementation, which keeps the two implementations behaving identically (the contract suite
 * in tests/unit/catalog-contract.test.ts holds them to it). Names for search and sorting come
 * from the caller's Localizer, as with the static repository.
 */
export function createDbRepository(db: Db): CatalogRepository {
  const load = async (): Promise<CatalogRepository> => {
    const rows = await db
      .select()
      .from(schema.product)
      .where(published)
      .orderBy(asc(schema.product.sortOrder), asc(schema.product.slug));
    return createStaticRepository(rows.map(toProduct));
  };

  return {
    async list(query, l10n) {
      return (await load()).list(query, l10n);
    },
    async getBySlug(slug) {
      const [row] = await db
        .select()
        .from(schema.product)
        .where(and(eq(schema.product.slug, slug), published))
        .limit(1);
      return row ? toProduct(row) : null;
    },
    async listFeatured() {
      return (await load()).listFeatured();
    },
    async listPromo() {
      return (await load()).listPromo();
    },
    async facets() {
      return (await load()).facets();
    },
    async total() {
      return (await load()).total();
    },
  };
}
