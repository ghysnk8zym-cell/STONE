import type {
  CatalogQuery,
  CatalogRepository,
  Localizer,
  Product,
} from "./types";

function compareText(a: string, b: string, locale?: string): number {
  return a.localeCompare(b, locale, { sensitivity: "base" });
}

/** Case-insensitive search key; ё counts as е, as Russian users type it (черный finds Чёрный). */
function fold(text: string): string {
  return text.toLocaleLowerCase().replaceAll("ё", "е");
}

// Home v2 1440 (722:1300) order.
const FEATURED = ["black-marble", "grey-limestone", "grey-marble"];
const PROMO = ["taupe-rock", "graphite-rock", "split-limestone"];

export function createStaticRepository(
  products: readonly Product[],
  locale?: string,
): CatalogRepository {
  const matches = (
    p: Product,
    query: CatalogQuery,
    l10n: Localizer,
  ): boolean => {
    if (query.material && p.material !== query.material) return false;
    if (query.color && p.colorGroup !== query.color) return false;
    if (query.finish && p.finish !== query.finish) return false;
    if (query.sale && p.oldPriceCents === undefined) return false;
    if (query.q) {
      const needle = fold(query.q);
      const haystack = fold(
        `${l10n.name(p.slug)} ${l10n.material(p.material)}`,
      );
      if (!haystack.includes(needle)) return false;
    }
    return true;
  };

  const pick = (slugs: string[]) =>
    slugs.flatMap((slug) => products.find((p) => p.slug === slug) ?? []);

  return {
    async list(query, l10n) {
      const found = products.filter((p) => matches(p, query, l10n));
      const byName = (a: Product, b: Product) =>
        compareText(
          l10n.name(a.slug),
          l10n.name(b.slug),
          l10n.locale ?? locale,
        );
      switch (query.sort) {
        case "name-asc":
          return found.sort(byName);
        case "name-desc":
          return found.sort((a, b) => byName(b, a));
        case "price-asc":
          return found.sort(
            (a, b) => a.priceCents - b.priceCents || byName(a, b),
          );
        case "price-desc":
          return found.sort(
            (a, b) => b.priceCents - a.priceCents || byName(a, b),
          );
      }
    },
    async getBySlug(slug) {
      return products.find((p) => p.slug === slug) ?? null;
    },
    async listFeatured() {
      return pick(FEATURED);
    },
    async listPromo() {
      return pick(PROMO);
    },
    async facets() {
      const sorted = <T extends string>(values: T[]) =>
        [...new Set(values)].sort();
      return {
        materials: sorted(products.map((p) => p.material)),
        colors: sorted(products.map((p) => p.colorGroup)),
        finishes: sorted(products.map((p) => p.finish)),
      };
    },
    async total() {
      return products.length;
    },
  };
}
