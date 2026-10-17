import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createDb, schema } = await import("@/server/db");
const { seedCatalog } = await import("@/server/db/seed");
const { createDbRepository } = await import("@/server/catalog/db-repository");
const { createStaticRepository } =
  await import("@/server/catalog/static-repository");
const { seed: products } = await import("@/server/catalog/seed");

import type {
  CatalogQuery,
  CatalogRepository,
  Localizer,
} from "@/server/catalog/types";

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

async function databaseRepository() {
  const db = await createDb("pglite://memory");
  if (!db) throw new Error("expected a database");
  await seedCatalog(db);
  return { db, repository: createDbRepository(db) };
}

// The Phase 3 catalog behaviour, run against every implementation of CatalogRepository.
const implementations: {
  name: string;
  create: () => Promise<CatalogRepository>;
}[] = [
  { name: "static", create: async () => createStaticRepository(products) },
  {
    name: "database",
    create: async () => (await databaseRepository()).repository,
  },
];

describe.each(implementations)("catalog contract: $name", ({ create }) => {
  let catalog: CatalogRepository;
  beforeAll(async () => {
    catalog = await create();
  }, 60_000);

  it("holds the 12 products with their prices", async () => {
    expect(await catalog.total()).toBe(12);
    expect((await catalog.getBySlug("black-marble"))?.priceCents).toBe(24000);
    expect((await catalog.getBySlug("charcoal-ledger"))?.priceCents).toBe(3800);
    expect((await catalog.getBySlug("concrete-paver"))?.oldPriceCents).toBe(
      8800,
    );
  });

  it("returns the whole product shape", async () => {
    const p = await catalog.getBySlug("concrete-paver");
    expect(p).toMatchObject({
      slug: "concrete-paver",
      material: "concrete",
      color: "grey",
      colorGroup: "grey",
      finish: "smooth",
      formatMm: [600, 400, 40],
      priceCents: 7500,
      oldPriceCents: 8800,
      discountPercent: 15,
      isPlaceholder: true,
      image: "images/catalog/concrete-paver",
      imageFit: "cover",
    });
    const plain = await catalog.getBySlug("black-marble");
    expect(plain?.imageFit).toBe("contain");
    expect(plain?.oldPriceCents).toBeUndefined();
    expect(plain?.discountPercent).toBeUndefined();
  });

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
    expect(byMaterial.map((p) => p.slug)).toEqual([
      "black-marble",
      "grey-marble",
    ]);

    const byName = await catalog.list({ ...base, q: "ledger" }, l10n);
    expect(byName.map((p) => p.slug)).toEqual([
      "charcoal-ledger",
      "silver-ledger",
    ]);
  });

  it("ru search folds ё to е on both sides", async () => {
    const names: Record<string, string> = {
      "black-marble": "Чёрный мрамор",
      "grey-marble": "Серый мрамор",
    };
    const ru: Localizer = {
      name: (slug) => names[slug] ?? slug,
      material: (m) => m,
    };
    const find = async (q: string) =>
      (await catalog.list({ ...base, q }, ru)).map((p) => p.slug);
    expect(await find("черный")).toEqual(["black-marble"]);
    expect(await find("ЧЁРНЫЙ")).toEqual(["black-marble"]);
    expect(await find("чёрн")).toEqual(["black-marble"]);
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
    expect(cheap[0].priceCents).toBe(
      Math.min(...products.map((p) => p.priceCents)),
    );
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
    expect(facets.finishes).toEqual([
      "chipped",
      "honed",
      "polished",
      "smooth",
      "split-face",
    ]);
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

  it("name sort uses the locale of the Localizer", async () => {
    const names: Record<string, string> = {
      "black-marble": "z",
      "grey-marble": "ä",
    };
    const swedish: Localizer = {
      name: (slug) => names[slug] ?? slug,
      material: (m) => m,
      locale: "sv",
    };
    const english: Localizer = { ...swedish, locale: "en" };
    const only = { ...base, q: "marble" };
    // Swedish sorts "ä" after "z", English sorts it next to "a"
    expect((await catalog.list(only, swedish)).map((p) => p.slug)).toEqual([
      "black-marble",
      "grey-marble",
    ]);
    expect((await catalog.list(only, english)).map((p) => p.slug)).toEqual([
      "grey-marble",
      "black-marble",
    ]);
  });

  it("sorts Cyrillic names in ru alphabetical order", async () => {
    const names: Record<string, string> = {
      "black-marble": "Чёрный мрамор",
      "grey-marble": "Серый мрамор",
      "taupe-rock": "Ясный камень",
      "golden-rock": "Алый камень",
    };
    const ru: Localizer = {
      name: (slug) => names[slug] ?? `я ${slug}`,
      material: (m) => m,
      locale: "ru",
    };
    const sorted = (await catalog.list(base, ru))
      .map((p) => names[p.slug])
      .filter(Boolean);
    expect(sorted).toEqual([
      "Алый камень",
      "Серый мрамор",
      "Чёрный мрамор",
      "Ясный камень",
    ]);
  });
});

describe("database catalog", () => {
  it("hides unpublished products everywhere", async () => {
    const { db, repository } = await databaseRepository();
    await db
      .update(schema.product)
      .set({ published: false })
      .where(eq(schema.product.slug, "taupe-rock"));

    expect(await repository.getBySlug("taupe-rock")).toBeNull();
    expect(await repository.total()).toBe(11);
    expect(
      (await repository.list(base, l10n)).map((p) => p.slug),
    ).not.toContain("taupe-rock");
    expect((await repository.listPromo()).map((p) => p.slug)).toEqual([
      "graphite-rock",
      "split-limestone",
    ]);
  });

  it("reflects admin edits to a product", async () => {
    const { db, repository } = await databaseRepository();
    await db
      .update(schema.product)
      .set({ priceCents: 25000, oldPriceCents: null, discountPercent: null })
      .where(eq(schema.product.slug, "black-marble"));
    const p = await repository.getBySlug("black-marble");
    expect(p?.priceCents).toBe(25000);
    expect(p?.oldPriceCents).toBeUndefined();
  });
});
