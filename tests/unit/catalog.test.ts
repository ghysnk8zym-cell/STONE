import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { discountPercent, parseCatalogQuery, products } from "@/server/catalog";

// Repository behaviour (list, search, sort, facets...) is covered by
// tests/unit/catalog-contract.test.ts, which runs it against every implementation.

describe("catalog seed", () => {
  it("seed has 12 products with unique slugs", () => {
    expect(products).toHaveLength(12);
    expect(new Set(products.map((p) => p.slug)).size).toBe(12);
  });

  it("every product has a catalog image key and a placeholder price", () => {
    for (const p of products) {
      expect(p.image).toBe(`images/catalog/${p.slug}`);
      expect(p.isPlaceholder).toBe(true);
    }
  });
});

describe("parseCatalogQuery", () => {
  it("parseCatalogQuery drops unknown values", () => {
    expect(
      parseCatalogQuery({ material: "granite", sort: "foo", sale: "yes" }),
    ).toEqual({
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
  const pct = (slug: string) =>
    discountPercent(products.find((p) => p.slug === slug)!);

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
