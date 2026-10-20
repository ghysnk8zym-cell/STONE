import { and, eq, sql } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  isNotFound,
  nextTestIp,
  redirectTarget,
  sessionCookieFrom,
  signIn,
  signUp,
  TEST_BASE_URL,
  TEST_PASSWORD,
  TEST_SECRET,
  thrown,
} from "./auth-helpers";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({
  headers: new Headers(),
  refreshed: [] as string[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => request.refreshed.push(path),
}));

function asBrowser(cookie?: string) {
  request.headers = new Headers({
    origin: TEST_BASE_URL,
    host: new URL(TEST_BASE_URL).host,
    "x-forwarded-for": nextTestIp(),
    "x-stone-path": "/en/admin/promotions",
  });
  if (cookie) request.headers.set("cookie", cookie);
  request.refreshed = [];
}
function reset() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}
const initial = {
  revision: 0,
  priceCents: 10000,
  oldPriceCents: null,
  discountPercent: null,
};
const offered = { priceCents: 8000, oldPriceCents: 10000, discountPercent: 15 };
const slug = "promotion-test";

describe("product promotions (real PGlite and Better Auth)", () => {
  let actions: typeof import("@/server/admin/actions");
  let queries: typeof import("@/server/admin/promotion-queries");
  let schema: typeof import("@/server/db/schema");
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let repository: import("@/server/catalog/types").CatalogRepository;
  let adminCookie: string;
  let clientCookie: string;
  let originalCopy: {
    productId: string;
    locale: string;
    name: string;
    description: string;
  }[];
  const row = async () =>
    (
      await db
        .select()
        .from(schema.product)
        .where(eq(schema.product.slug, slug))
    )[0]!;

  beforeAll(async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/admin/actions");
    queries = await import("@/server/admin/promotion-queries");
    schema = await import("@/server/db/schema");
    db = (await (await import("@/server/db")).getDb())!;
    const auth = (await (await import("@/server/auth/auth")).getAuth())!;
    for (const email of ["admin@example.test", "client@example.test"])
      expect((await signUp(auth, email)).status).toBe(200);
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.email, "admin@example.test"));
    adminCookie = sessionCookieFrom(
      await signIn(auth, "admin@example.test", TEST_PASSWORD),
    )!;
    clientCookie = sessionCookieFrom(
      await signIn(auth, "client@example.test", TEST_PASSWORD),
    )!;
    const seed = await import("@/server/db/seed");
    await seed.seedCatalog(db);
    await seed.seedAccountData(db, "client@example.test");
    const [base] = await db.select().from(schema.product).limit(1);
    const id = crypto.randomUUID();
    await db.insert(schema.product).values({ ...base!, id, slug, ...initial });
    await db.insert(schema.productTranslation).values([
      {
        productId: id,
        locale: "en",
        name: "Promotion test",
        description: "English",
      },
      {
        productId: id,
        locale: "ru",
        name: "Тестовая акция",
        description: "Русский",
      },
    ]);
    repository = (
      await import("@/server/catalog/db-repository")
    ).createDbRepository(db);
    originalCopy = await db
      .select()
      .from(schema.productTranslation)
      .where(eq(schema.productTranslation.productId, id));
  }, 60_000);
  beforeEach(async () => {
    await db
      .update(schema.product)
      .set({ ...initial, published: true })
      .where(eq(schema.product.slug, slug));
    asBrowser(adminCookie);
    for (const copy of originalCopy)
      await db
        .update(schema.productTranslation)
        .set(copy)
        .where(
          and(
            eq(schema.productTranslation.productId, copy.productId),
            eq(schema.productTranslation.locale, copy.locale),
          ),
        );
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  for (const role of ["Guest", "Client"])
    it(`${role} cannot read the admin query or submit even malformed data`, async () => {
      asBrowser(role === "Guest" ? undefined : clientCookie);
      for (const call of [
        () => queries.getPromotionProducts("en"),
        () => actions.setProductPromotion(null, {}, {}),
      ]) {
        const error = await thrown(call);
        if (role === "Guest")
          expect(redirectTarget(error)).toBe(
            "/en/sign-in?next=%2Fen%2Fadmin%2Fpromotions",
          );
        else expect(isNotFound(error)).toBe(true);
      }
      expect(await row()).toMatchObject(initial);
      expect(request.refreshed).toEqual([]);
    });

  it.each([
    { priceCents: -1 },
    { priceCents: 10000001 },
    { priceCents: 0.5 },
    { priceCents: "100" },
    { oldPriceCents: 10000 },
    { oldPriceCents: 9000 },
    { oldPriceCents: -1 },
    { discountPercent: -1 },
    { discountPercent: 101 },
    { discountPercent: 1.5 },
    { discountPercent: "15" },
  ])("rejects invalid proposed fields %j without writing", async (bad) => {
    expect(
      await actions.setProductPromotion(slug, { ...initial, ...bad }, initial),
    ).toMatchObject({ ok: false, code: "invalid" });
    expect(await row()).toMatchObject(initial);
    expect(request.refreshed).toEqual([]);
  });

  it("rejects malformed expected values and slugs", async () => {
    for (const expected of [null, {}, { ...initial, priceCents: "10000" }])
      expect(
        await actions.setProductPromotion(slug, offered, expected),
      ).toMatchObject({ ok: false, code: "invalid" });
    expect(
      await actions.setProductPromotion("../bad", offered, initial),
    ).toMatchObject({ ok: false, code: "invalid" });
    expect(await row()).toMatchObject(initial);
  });

  it("stores independent badge/prices, changes only three fields and refreshes every consumer", async () => {
    const before = await row();
    const translations = await db.select().from(schema.productTranslation);
    const orders = await db.select().from(schema.orderItem);
    const curated = (await repository.listPromo()).map((p) => p.slug);
    expect(
      await actions.setProductPromotion(
        slug,
        { ...offered, published: false },
        initial,
      ),
    ).toEqual({ ok: true, prices: { ...offered, revision: 1 } });
    const after = await row();
    expect(after).toEqual({
      ...before,
      ...offered,
      revision: 1,
      updatedAt: after.updatedAt,
    });
    expect(await db.select().from(schema.productTranslation)).toEqual(
      translations,
    );
    expect(await db.select().from(schema.orderItem)).toEqual(orders);
    expect(await repository.getBySlug(slug)).toMatchObject(offered);
    expect((await repository.listPromo()).map((p) => p.slug)).toEqual(curated);
    expect(request.refreshed).toEqual(
      expect.arrayContaining([
        "/en",
        "/ru",
        "/en/catalog",
        "/ru/catalog",
        "/[locale]/catalog/[slug]",
        "/[locale]/account",
        "/[locale]/admin",
      ]),
    );
  });

  it("preserves a draft product's visibility", async () => {
    await db
      .update(schema.product)
      .set({ published: false })
      .where(eq(schema.product.slug, slug));
    expect(
      await actions.setProductPromotion(slug, offered, initial),
    ).toMatchObject({ ok: true });
    expect((await row()).published).toBe(false);
    expect(await repository.getBySlug(slug)).toBeNull();
  });

  it("keeps zero distinct from null and clears optional fields without restoring the price", async () => {
    const free = { priceCents: 0, oldPriceCents: 10000, discountPercent: 0 };
    expect(await actions.setProductPromotion(slug, free, initial)).toEqual({
      ok: true,
      prices: { ...free, revision: 1 },
    });
    const cleared = {
      priceCents: 0,
      oldPriceCents: null,
      discountPercent: null,
    };
    expect(
      await actions.setProductPromotion(slug, cleared, {
        ...free,
        revision: 1,
      }),
    ).toEqual({
      ok: true,
      prices: { ...cleared, revision: 2 },
    });
    const product = await repository.getBySlug(slug);
    expect(product?.priceCents).toBe(0);
    expect(product?.oldPriceCents).toBeUndefined();
    expect(product?.discountPercent).toBeUndefined();
    expect(
      await actions.setProductPromotion(
        slug,
        { ...cleared, discountPercent: 100 },
        { ...cleared, revision: 2 },
      ),
    ).toMatchObject({ ok: true });
  });

  it("rejects a stale save, including a nullable-field mismatch", async () => {
    await actions.setProductPromotion(slug, offered, initial);
    request.refreshed = [];
    expect(
      await actions.setProductPromotion(
        slug,
        { ...offered, priceCents: 7000 },
        initial,
      ),
    ).toEqual({ ok: false, code: "conflict" });
    expect(
      await actions.setProductPromotion(slug, initial, {
        ...offered,
        discountPercent: null,
        revision: 1,
      }),
    ).toEqual({ ok: false, code: "conflict" });
    expect(await row()).toMatchObject(offered);
    expect(request.refreshed).toEqual([]);
  });

  it("only one of two competing saves with the same baseline wins", async () => {
    const results = await Promise.all([
      actions.setProductPromotion(slug, offered, initial),
      actions.setProductPromotion(
        slug,
        { ...offered, priceCents: 7500 },
        initial,
      ),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "conflict")).toHaveLength(
      1,
    );
  });

  it("reports a missing product", async () => {
    expect(
      await actions.setProductPromotion("missing-product", offered, initial),
    ).toEqual({ ok: false, code: "not-found" });
  });

  describe("cross-editor revision protection", () => {
    const fullInput = (overrides: Record<string, unknown> = {}) => ({
      nameRu: "Stone RU",
      nameEn: "Stone EN",
      descriptionRu: "RU",
      descriptionEn: "EN",
      material: "marble",
      color: "grey",
      colorGroup: "grey",
      finish: "honed",
      lengthMm: 600,
      widthMm: 300,
      thicknessMm: 20,
      image: "images/catalog/grey-marble",
      published: true,
      ...initial,
      ...overrides,
    });

    it("rejects a full Product save after Promotions without changing translations or other fields", async () => {
      const translations = await db.select().from(schema.productTranslation);
      await actions.setProductPromotion(slug, offered, initial);
      const saved = await row();
      expect(
        await actions.updateProduct(
          slug,
          fullInput({ nameEn: "Stale name" }),
          0,
        ),
      ).toMatchObject({ ok: false, code: "conflict" });
      expect(await row()).toEqual(saved);
      expect(await db.select().from(schema.productTranslation)).toEqual(
        translations,
      );
    });

    it("rejects Promotions after a full Product save and preserves all legitimate product fields", async () => {
      expect(
        await actions.updateProduct(
          slug,
          fullInput({ ...offered, nameEn: "New name", finish: "polished" }),
          0,
        ),
      ).toMatchObject({ ok: true });
      const saved = await row();
      expect(await actions.setProductPromotion(slug, initial, initial)).toEqual(
        { ok: false, code: "conflict" },
      );
      expect(await row()).toEqual(saved);
      const detail = await (
        await import("@/server/admin/queries")
      ).getAdminProduct(slug);
      expect(detail).toMatchObject({
        names: { en: "New name", ru: "Stone RU" },
        descriptions: { en: "EN", ru: "RU" },
        finish: "polished",
        ...offered,
        revision: 1,
      });
    });

    it("rejects stale non-price and publication edits, including prices changed back to the original values", async () => {
      expect(await actions.updateProduct(slug, fullInput(), 0)).toMatchObject({
        ok: true,
      });
      expect(
        await actions.updateProduct(slug, fullInput({ nameEn: "Stale" }), 0),
      ).toMatchObject({ ok: false, code: "conflict" });
      expect(await actions.setProductPublished(slug, false, 0)).toMatchObject({
        ok: false,
        code: "conflict",
      });
      expect(
        await actions.setProductPromotion(slug, offered, initial),
      ).toMatchObject({ ok: false, code: "conflict" });
    });

    it("allows exactly one concurrent cross-editor save and no partial translation writes", async () => {
      const translations = await db.select().from(schema.productTranslation);
      const [productResult, promotionResult] = await Promise.all([
        actions.updateProduct(
          slug,
          fullInput({ nameEn: "Winner", priceCents: 7500 }),
          0,
        ),
        actions.setProductPromotion(slug, offered, initial),
      ]);
      expect([productResult, promotionResult].filter((r) => r.ok)).toHaveLength(
        1,
      );
      expect(
        [productResult, promotionResult].filter(
          (r) => !r.ok && r.code === "conflict",
        ),
      ).toHaveLength(1);
      if (productResult.ok) {
        expect(await row()).toMatchObject({ priceCents: 7500, revision: 1 });
        expect(await repository.getBySlug(slug)).toMatchObject({
          copy: { en: { name: "Winner" } },
        });
      } else {
        expect(await row()).toMatchObject({ ...offered, revision: 1 });
        expect(await db.select().from(schema.productTranslation)).toEqual(
          translations,
        );
      }
    });

    it("requires valid expected revisions rather than accepting legacy blind writes", async () => {
      for (const version of [undefined, null, -1, 0.5, "0", 2147483647]) {
        expect(
          await actions.updateProduct(slug, fullInput(), version),
        ).toMatchObject({ ok: false, code: "invalid" });
        expect(
          await actions.setProductPublished(slug, false, version),
        ).toMatchObject({ ok: false, code: "invalid" });
      }
      expect(await row()).toMatchObject(initial);
    });

    it("rolls back the entire product update when a translation fails", async () => {
      await db.execute(
        sql`alter table product_translation add constraint test_translation_failure check (name <> '__reject__')`,
      );
      const before = await row();
      const copy = await db.select().from(schema.productTranslation);
      await expect(
        actions.updateProduct(
          slug,
          fullInput({ nameEn: "__reject__", priceCents: 123 }),
          0,
        ),
      ).rejects.toThrow();
      expect(await row()).toEqual(before);
      expect(await db.select().from(schema.productTranslation)).toEqual(copy);
    });

    it("rejects the old token after a price round trip and never wraps an exhausted revision", async () => {
      await actions.setProductPromotion(slug, offered, initial);
      await actions.setProductPromotion(slug, initial, {
        ...offered,
        revision: 1,
      });
      expect(
        await actions.setProductPromotion(slug, offered, initial),
      ).toMatchObject({ ok: false, code: "conflict" });
      expect(await actions.updateProduct(slug, fullInput(), 0)).toMatchObject({
        ok: false,
        code: "conflict",
      });
      await db
        .update(schema.product)
        .set({ revision: 2147483647 })
        .where(eq(schema.product.slug, slug));
      const before = await row();
      expect(
        await actions.updateProduct(slug, fullInput(), 2147483647),
      ).toMatchObject({ ok: false, code: "invalid" });
      expect(
        await actions.setProductPromotion(slug, offered, {
          ...initial,
          revision: 2147483647,
        }),
      ).toMatchObject({ ok: false, code: "invalid" });
      expect(await row()).toEqual(before);
    });

    it("migration and repeated seeding preserve existing revision tokens", async () => {
      const seed = await import("@/server/db/seed");
      const { migrate } = await import("@/server/db/migrate");
      await db
        .update(schema.product)
        .set({ revision: 42 })
        .where(eq(schema.product.slug, "black-marble"));
      await migrate(db);
      await seed.seedCatalog(db);
      const [product] = await db
        .select()
        .from(schema.product)
        .where(eq(schema.product.slug, "black-marble"));
      expect(product?.revision).toBe(42);
    });
  });

  it("returns localized explicit product data for published and draft products", async () => {
    await db
      .update(schema.product)
      .set({ published: false })
      .where(eq(schema.product.slug, slug));
    const en = (await queries.getPromotionProducts("en")).find(
      (p) => p.slug === slug,
    )!;
    const ru = (await queries.getPromotionProducts("ru")).find(
      (p) => p.slug === slug,
    )!;
    expect(en).toMatchObject({
      ...initial,
      name: "Promotion test",
      published: false,
    });
    expect(ru.name).toBe("Тестовая акция");
    expect(Object.keys(en).sort()).toEqual([
      "discountPercent",
      "formatMm",
      "image",
      "imageFit",
      "material",
      "name",
      "oldPriceCents",
      "priceCents",
      "published",
      "revision",
      "slug",
    ]);
  });
});
