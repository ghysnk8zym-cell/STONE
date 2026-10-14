import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  catalog,
  discountPercent,
  parseCatalogQuery,
  products,
  type CatalogQuery,
  type Localizer,
} from "@/server/catalog";

const ruMaterial: Record<string, string> = {
  marble: "Мрамор",
  limestone: "Известняк",
  slate: "Сланец",
  sandstone: "Песчаник",
  quartzite: "Кварцит",
  concrete: "Бетон",
};

const l10n: Localizer = {
  name: (slug) => slug.replace(/-/g, " "),
  material: (m) => ruMaterial[m] ?? m,
};

const base: CatalogQuery = { sort: "name-asc" };

describe("catalog seed", () => {
  it("seed has 12 products with unique slugs", async () => {
    expect(products).toHaveLength(12);
    expect(new Set(products.map((p) => p.slug)).size).toBe(12);
    expect(await catalog.total()).toBe(12);
    expect((await catalog.getBySlug("black-marble"))?.priceCents).toBe(24000);
    expect((await catalog.getBySlug("charcoal-ledger"))?.priceCents).toBe(3800);
    expect((await catalog.getBySlug("concrete-paver"))?.oldPriceCents).toBe(8800);
  });

  it("every product has a catalog image key and a placeholder price", () => {
    for (const p of products) {
      expect(p.image).toBe(`images/catalog/${p.slug}`);
      expect(p.isPlaceholder).toBe(true);
    }
  });
});

describe("catalog list", () => {
  it("list filters by material, color, finish and sale", async () => {
    const marble = await catalog.list({ ...base, material: "marble" }, l10n);
    expect(marble.map((p) => p.slug)).toEqual(["black-marble", "grey-marble"]);

    const black = await catalog.list({ ...base, color: "dark" }, l10n);
    expect(black.map((p) => p.slug)).toEqual([
      "black-marble",
      "charcoal-ledger",
      "graphite-rock",
      "graphite-stack",
    ]);

    const honed = await catalog.list({ ...base, finish: "honed" }, l10n);
    expect(honed.map((p) => p.slug)).toEqual(["grey-limestone"]);

    const sale = await catalog.list({ ...base, sale: true }, l10n);
    expect(sale.map((p) => p.slug)).toEqual([
      "concrete-paver",
      "graphite-rock",
      "split-limestone",
      "taupe-rock",
    ]);
    expect(sale.every((p) => p.oldPriceCents !== undefined)).toBe(true);
  });

  it("search matches localised name and material, case-insensitive", async () => {
    const byMaterial = await catalog.list({ ...base, q: "МРАМОР" }, l10n);
    expect(byMaterial.map((p) => p.slug)).toEqual(["black-marble", "grey-marble"]);

    const byName = await catalog.list({ ...base, q: "ledger" }, l10n);
    expect(byName.map((p) => p.slug)).toEqual(["charcoal-ledger", "silver-ledger"]);
  });

  it("sorts by name using the localised name and by price", async () => {
    const reversed: Localizer = {
      ...l10n,
      name: (slug) => (slug === "taupe-rock" ? "AAA" : slug),
    };
    const asc = await catalog.list(base, reversed);
    expect(asc[0].slug).toBe("taupe-rock");
    const desc = await catalog.list({ ...base, sort: "name-desc" }, reversed);
    expect(desc.at(-1)?.slug).toBe("taupe-rock");

    const cheap = await catalog.list({ ...base, sort: "price-asc" }, l10n);
    expect(cheap[0].priceCents).toBe(Math.min(...products.map((p) => p.priceCents)));
    const dear = await catalog.list({ ...base, sort: "price-desc" }, l10n);
    expect(dear[0].slug).toBe("black-marble");
  });

  it("getBySlug returns null for unknown slug", async () => {
    expect(await catalog.getBySlug("nope")).toBeNull();
  });

  it("facets lists values present in the data, sorted", async () => {
    const facets = await catalog.facets();
    expect(facets.materials).toEqual([
      "concrete",
      "limestone",
      "marble",
      "quartzite",
      "sandstone",
      "slate",
    ]);
    expect(facets.finishes).toEqual(["chipped", "honed", "polished", "smooth", "split-face"]);
    expect(facets.colors).toEqual(["dark", "grey", "light", "warm"]);
  });

  it("listFeatured and listPromo follow the Home v2 order", async () => {
    expect((await catalog.listFeatured()).map((p) => p.slug)).toEqual([
      "black-marble",
      "grey-limestone",
      "grey-marble",
    ]);
    expect((await catalog.listPromo()).map((p) => p.slug)).toEqual([
      "taupe-rock",
      "graphite-rock",
      "split-limestone",
    ]);
  });
});

describe("parseCatalogQuery", () => {
  it("parseCatalogQuery drops unknown values", () => {
    expect(parseCatalogQuery({ material: "granite", sort: "foo", sale: "yes" })).toEqual({
      sort: "name-asc",
    });
  });

  it("keeps valid values, arrays take the first value", () => {
    expect(
      parseCatalogQuery({
        material: ["marble", "slate"],
        color: "grey",
        finish: "polished",
        sale: "1",
        sort: "price-desc",
      }),
    ).toEqual({
      material: "marble",
      color: "grey",
      finish: "polished",
      sale: true,
      sort: "price-desc",
    });
  });

  it("trims q, drops empty q and caps it at 100 chars", () => {
    expect(parseCatalogQuery({ q: "  stone  " }).q).toBe("stone");
    expect(parseCatalogQuery({ q: "   " }).q).toBeUndefined();
    expect(parseCatalogQuery({ q: "x".repeat(150) }).q).toHaveLength(100);
  });
});

describe("discountPercent", () => {
  const pct = (slug: string) => discountPercent(products.find((p) => p.slug === slug)!);

  it("returns the Figma badge value", () => {
    expect(pct("concrete-paver")).toBe(15);
    expect(pct("graphite-rock")).toBe(25);
    expect(pct("split-limestone")).toBe(20);
    expect(pct("taupe-rock")).toBe(20);
  });

  it("is undefined without an old price", () => {
    expect(pct("black-marble")).toBeUndefined();
  });
});
