import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import type { Db } from "../db";
import { schema } from "../db";
import { createStaticRepository } from "./static-repository";
import type {
  CatalogRepository,
  Color,
  ColorGroup,
  Finish,
  Localizer,
  Material,
  Product,
  ProductCopy,
  ProductLocale,
} from "./types";

type Copy = NonNullable<Product["copy"]>;

function toProduct(
  row: typeof schema.product.$inferSelect,
  copy: Copy | undefined,
): Product {
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
  if (copy) product.copy = copy;
  if (row.oldPriceCents !== null) product.oldPriceCents = row.oldPriceCents;
  if (row.discountPercent !== null) {
    product.discountPercent = row.discountPercent;
  }
  return product;
}

const published = eq(schema.product.published, true);

function isProductLocale(locale: string | undefined): locale is ProductLocale {
  return locale === "ru" || locale === "en";
}

/** The stored translations of these products, by product id. */
async function loadCopy(
  db: Db,
  productIds: string[],
): Promise<Map<string, Copy>> {
  const byProduct = new Map<string, Copy>();
  if (productIds.length === 0) return byProduct;
  const rows = await db
    .select()
    .from(schema.productTranslation)
    .where(inArray(schema.productTranslation.productId, productIds));
  for (const row of rows) {
    if (!isProductLocale(row.locale)) continue;
    const entry: ProductCopy = { name: row.name, description: row.description };
    const copy = byProduct.get(row.productId) ?? {};
    copy[row.locale] = entry;
    byProduct.set(row.productId, copy);
  }
  return byProduct;
}

/**
 * CatalogRepository over the `product` table. Only published products are visible.
 *
 * The catalog is small, so the filtering, search and sorting rules are not duplicated in SQL:
 * the published rows are loaded in `sort_order` and handed to the static repository's
 * implementation, which keeps the two implementations behaving identically (the contract suite
 * in tests/unit/catalog-contract.test.ts holds them to it). Names for search and sorting come
 * from the stored translation of the request locale (`Localizer.locale`) when there is one, and
 * from the caller's Localizer otherwise (messages, the seed's source).
 */
export function createDbRepository(db: Db): CatalogRepository {
  const load = async (): Promise<Product[]> => {
    const rows = await db
      .select()
      .from(schema.product)
      .where(published)
      .orderBy(asc(schema.product.sortOrder), asc(schema.product.slug));
    const copy = await loadCopy(
      db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => toProduct(row, copy.get(row.id)));
  };
  const loadRepository = async (): Promise<CatalogRepository> =>
    createStaticRepository(await load());

  /** Prefers the stored name of the request locale, so an admin's rename is searchable and sortable. */
  const withStoredNames = (products: Product[], l10n: Localizer): Localizer => {
    const locale = l10n.locale;
    if (!l10n.preferStoredNames || !isProductLocale(locale)) return l10n;
    const names = new Map(
      products.map((p) => [p.slug, p.copy?.[locale]?.name?.trim()]),
    );
    return { ...l10n, name: (slug) => names.get(slug) || l10n.name(slug) };
  };

  return {
    async list(query, l10n) {
      const products = await load();
      return createStaticRepository(products).list(
        query,
        withStoredNames(products, l10n),
      );
    },
    async getBySlug(slug) {
      const [row] = await db
        .select()
        .from(schema.product)
        .where(and(eq(schema.product.slug, slug), published))
        .limit(1);
      if (!row) return null;
      const copy = await loadCopy(db, [row.id]);
      return toProduct(row, copy.get(row.id));
    },
    async listFeatured() {
      return (await loadRepository()).listFeatured();
    },
    async listPromo() {
      return (await loadRepository()).listPromo();
    },
    async facets() {
      return (await loadRepository()).facets();
    },
    async total() {
      return (await loadRepository()).total();
    },
  };
}
