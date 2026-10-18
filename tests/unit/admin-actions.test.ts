import { eq } from "drizzle-orm";
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

// The actions read the incoming request through next/headers; the tests play the browser.
const request = vi.hoisted(() => ({
  headers: new Headers(),
  revalidated: [] as string[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
  }),
}));
// revalidatePath needs Next's runtime store; here it only records the calls.
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => {
    request.revalidated.push(type ? `${path}#${type}` : path);
  },
}));

function asBrowser(init: { cookie?: string; path?: string } = {}) {
  request.headers = new Headers({
    origin: TEST_BASE_URL,
    host: new URL(TEST_BASE_URL).host,
    "x-forwarded-for": nextTestIp(),
  });
  if (init.cookie) request.headers.set("cookie", init.cookie);
  request.headers.set("x-stone-path", init.path ?? "/ru/admin/products");
  request.revalidated = [];
}

function resetSingletons() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

type Actions = typeof import("@/server/admin/actions");
type Schema = typeof import("@/server/db/schema");
type Db = NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;

/** A valid product input; tests override single fields. */
function input(overrides: Record<string, unknown> = {}) {
  return {
    nameRu: "Тестовый камень",
    nameEn: "Test Stone",
    descriptionRu: "Описание на русском.",
    descriptionEn: "Description in English.",
    material: "marble",
    color: "grey",
    colorGroup: "grey",
    finish: "honed",
    lengthMm: 600,
    widthMm: 300,
    thicknessMm: 20,
    priceCents: 12500,
    oldPriceCents: null,
    discountPercent: null,
    image: "images/catalog/grey-marble",
    published: true,
    ...overrides,
  };
}

describe("admin server actions (PGlite + real Better Auth)", () => {
  let actions: Actions;
  let schema: Schema;
  let db: Db;
  let auth: NonNullable<
    Awaited<ReturnType<typeof import("@/server/auth/auth").getAuth>>
  >;
  let repository: import("@/server/catalog/types").CatalogRepository;
  const adminEmail = "admin@example.test";
  const clientEmail = "client@example.test";

  async function cookieFor(email: string) {
    const cookie = sessionCookieFrom(await signIn(auth, email, TEST_PASSWORD));
    if (!cookie) throw new Error("expected a session cookie");
    return cookie;
  }

  const asAdmin = async () =>
    asBrowser({ cookie: await cookieFor(adminEmail) });
  const asClient = async () =>
    asBrowser({ cookie: await cookieFor(clientEmail) });

  async function productCount() {
    return (await db.select().from(schema.product)).length;
  }

  beforeAll(async () => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/admin/actions");
    schema = await import("@/server/db/schema");
    db = (await (await import("@/server/db")).getDb())!;
    auth = (await (await import("@/server/auth/auth")).getAuth())!;
    const seed = await import("@/server/db/seed");
    await seed.seedCatalog(db);
    repository = (
      await import("@/server/catalog/db-repository")
    ).createDbRepository(db);

    for (const [email, name] of [
      [adminEmail, "Admin"],
      [clientEmail, "Client"],
    ] as const) {
      expect((await signUp(auth, email, { name })).status).toBe(200);
    }
    // Sign-up always creates a client; only the seed makes admins, so the test does what the seed does.
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.email, adminEmail));
    await seed.seedAccountData(db, clientEmail);
  }, 60_000);

  afterAll(() => {
    vi.unstubAllEnvs();
    resetSingletons();
  });

  beforeEach(() => asBrowser());

  describe("admin actions reject a client session and a guest", () => {
    const calls: [string, () => Promise<unknown>][] = [
      ["createProduct", () => actions.createProduct(input({ slug: "x-one" }))],
      ["updateProduct", () => actions.updateProduct("black-marble", input())],
      [
        "setProductPublished",
        () => actions.setProductPublished("black-marble", false),
      ],
      ["setOrderStatus", () => actions.setOrderStatus("D-1048", "delivered")],
    ];

    it.each(calls)(
      "%s: a guest is sent to sign-in and nothing is written",
      async (_name, call) => {
        asBrowser({ path: "/en/admin/products" });
        const error = await thrown(call);
        expect(redirectTarget(error)).toBe(
          "/en/sign-in?next=%2Fen%2Fadmin%2Fproducts",
        );
        expect(await productCount()).toBe(12);
        expect(request.revalidated).toEqual([]);
      },
    );

    it.each(calls)(
      "%s: a client gets a 404 and nothing is written",
      async (_name, call) => {
        await asClient();
        expect(isNotFound(await thrown(call))).toBe(true);
        expect(await productCount()).toBe(12);
        const [black] = await db
          .select()
          .from(schema.product)
          .where(eq(schema.product.slug, "black-marble"));
        expect(black?.published).toBe(true);
        const [order] = await db
          .select()
          .from(schema.order)
          .where(eq(schema.order.number, "D-1048"));
        expect(order?.status).toBe("in_progress");
        expect(request.revalidated).toEqual([]);
      },
    );

    it("the guard runs before validation: a client posting garbage still gets the 404, not a field error", async () => {
      await asClient();
      expect(
        isNotFound(await thrown(() => actions.createProduct("not an object"))),
      ).toBe(true);
    });
  });

  describe("createProduct", () => {
    it("creates a product with both languages, visible in the catalog, and refreshes the pages", async () => {
      await asAdmin();
      const result = await actions.createProduct(
        input({ slug: "fresh-stone", priceCents: 9900 }),
      );
      expect(result).toEqual({ ok: true, slug: "fresh-stone" });

      const created = await repository.getBySlug("fresh-stone");
      expect(created).toMatchObject({
        slug: "fresh-stone",
        material: "marble",
        priceCents: 9900,
        formatMm: [600, 300, 20],
        imageFit: "contain",
        copy: {
          ru: { name: "Тестовый камень" },
          en: { name: "Test Stone", description: "Description in English." },
        },
      });
      expect(await repository.total()).toBe(13);
      expect(request.revalidated).toEqual(
        expect.arrayContaining([
          "/[locale]/catalog/[slug]#page",
          "/[locale]/catalog#page",
          // the home page is static: only the concrete paths reach it (the pattern does not)
          "/ru",
          "/en",
          "/ru/catalog",
          "/en/catalog",
        ]),
      );
    });

    it("rejects a taken slug, also with another case written into the URL form", async () => {
      await asAdmin();
      expect(
        await actions.createProduct(input({ slug: "black-marble" })),
      ).toEqual({ ok: false, code: "slug-taken", fields: ["slug"] });
      expect(
        await actions.createProduct(input({ slug: "fresh-stone" })),
      ).toEqual({ ok: false, code: "slug-taken", fields: ["slug"] });
    });

    it("zod rejects a bad slug, price, text, enum, image and the wrong old price", async () => {
      await asAdmin();
      const before = await productCount();
      const bad: [Record<string, unknown>, string][] = [
        [{ slug: "Upper-Case" }, "slug"],
        [{ slug: "has space" }, "slug"],
        [{ slug: "../etc" }, "slug"],
        [{ slug: "double--dash" }, "slug"],
        [{ slug: "" }, "slug"],
        // `/admin/products/new` is the Add product page, so `new` cannot be a product
        [{ slug: "new" }, "slug"],
        [{ slug: "a".repeat(81) }, "slug"],
        [{ priceCents: -1 }, "priceCents"],
        [{ priceCents: 12.5 }, "priceCents"],
        [{ priceCents: "100" }, "priceCents"],
        [{ priceCents: 10_000_001 }, "priceCents"],
        [{ priceCents: Number.NaN }, "priceCents"],
        [{ nameRu: "" }, "nameRu"],
        [{ nameRu: "   " }, "nameRu"],
        [{ nameEn: "Two\nlines" }, "nameEn"],
        [{ nameEn: "x".repeat(121) }, "nameEn"],
        [{ descriptionRu: "bad\u0000byte" }, "descriptionRu"],
        [{ descriptionEn: "x".repeat(1001) }, "descriptionEn"],
        [{ material: "granite" }, "material"],
        [{ color: "pink" }, "color"],
        [{ finish: "glossy" }, "finish"],
        [{ lengthMm: 0 }, "lengthMm"],
        [{ widthMm: 10_001 }, "widthMm"],
        [{ thicknessMm: 1.5 }, "thicknessMm"],
        [{ discountPercent: 101 }, "discountPercent"],
        [{ image: "images/catalog/not-in-manifest" }, "image"],
        [{ image: "images/home/hero" }, "image"],
        [{ image: "../../secret" }, "image"],
        [{ priceCents: 5000, oldPriceCents: 5000 }, "oldPriceCents"],
        [{ priceCents: 5000, oldPriceCents: 4000 }, "oldPriceCents"],
        [{ published: "yes" }, "published"],
      ];
      for (const [override, field] of bad) {
        const result = await actions.createProduct(
          input({ slug: "never-created", ...override }),
        );
        expect(result, JSON.stringify(override)).toMatchObject({
          ok: false,
          code: "invalid",
        });
        expect(
          (result as { fields?: string[] }).fields,
          JSON.stringify(override),
        ).toContain(field);
      }
      for (const garbage of [undefined, null, 42, "x", [], {}]) {
        expect(await actions.createProduct(garbage)).toMatchObject({
          ok: false,
          code: "invalid",
        });
      }
      expect(await productCount()).toBe(before);
      expect(request.revalidated).toEqual([]);
    });

    it("accepts a sale price pair and keeps money in integer cents", async () => {
      await asAdmin();
      expect(
        await actions.createProduct(
          input({
            slug: "on-sale",
            priceCents: 10200,
            oldPriceCents: 12000,
            discountPercent: 15,
          }),
        ),
      ).toEqual({ ok: true, slug: "on-sale" });
      expect(await repository.getBySlug("on-sale")).toMatchObject({
        priceCents: 10200,
        oldPriceCents: 12000,
        discountPercent: 15,
      });
    });

    it("saves a draft: not in the catalog until it is published", async () => {
      await asAdmin();
      await actions.createProduct(
        input({ slug: "draft-stone", published: false }),
      );
      expect(await repository.getBySlug("draft-stone")).toBeNull();
      expect(
        (
          await db
            .select()
            .from(schema.product)
            .where(eq(schema.product.slug, "draft-stone"))
        )[0]?.published,
      ).toBe(false);
    });
  });

  describe("updateProduct and setProductPublished", () => {
    it("an edit of the ru name reaches the catalog copy, and the rest of the product follows", async () => {
      await asAdmin();
      const result = await actions.updateProduct(
        "fresh-stone",
        input({
          nameRu: "Свежий камень",
          priceCents: 11100,
          finish: "polished",
        }),
      );
      expect(result).toEqual({ ok: true, slug: "fresh-stone" });
      const product = await repository.getBySlug("fresh-stone");
      expect(product?.copy?.ru?.name).toBe("Свежий камень");
      expect(product?.copy?.en?.name).toBe("Test Stone");
      expect(product).toMatchObject({ priceCents: 11100, finish: "polished" });
      // the stored name wins for search and sorting in that locale
      const found = await repository.list(
        { sort: "name-asc", q: "свежий" },
        {
          name: (slug) => slug,
          material: (m) => m,
          locale: "ru",
          preferStoredNames: true,
        },
      );
      expect(found.map((p) => p.slug)).toEqual(["fresh-stone"]);
    });

    it("refuses an unknown product, a bad slug and bad input without changing anything", async () => {
      await asAdmin();
      expect(await actions.updateProduct("no-such-stone", input())).toEqual({
        ok: false,
        code: "not-found",
      });
      expect(await actions.updateProduct("Bad Slug", input())).toEqual({
        ok: false,
        code: "not-found",
      });
      expect(
        await actions.updateProduct("fresh-stone", input({ priceCents: -5 })),
      ).toMatchObject({ ok: false, code: "invalid", fields: ["priceCents"] });
      expect((await repository.getBySlug("fresh-stone"))?.priceCents).toBe(
        11100,
      );
    });

    it("unpublish removes the product from the catalog; publish brings it back", async () => {
      await asAdmin();
      expect(await actions.setProductPublished("fresh-stone", false)).toEqual({
        ok: true,
        published: false,
      });
      expect(await repository.getBySlug("fresh-stone")).toBeNull();
      expect(
        (
          await repository.list(
            { sort: "name-asc" },
            { name: (s) => s, material: (m) => m },
          )
        ).map((p) => p.slug),
      ).not.toContain("fresh-stone");
      expect(request.revalidated).toContain("/[locale]/catalog/[slug]#page");

      expect(await actions.setProductPublished("fresh-stone", true)).toEqual({
        ok: true,
        published: true,
      });
      expect(await repository.getBySlug("fresh-stone")).not.toBeNull();
    });

    it("refuses an unknown slug and a non-boolean flag", async () => {
      await asAdmin();
      expect(await actions.setProductPublished("no-such", true)).toEqual({
        ok: false,
        code: "not-found",
      });
      for (const bad of ["true", 1, null, undefined]) {
        expect(await actions.setProductPublished("fresh-stone", bad)).toEqual({
          ok: false,
          code: "invalid",
        });
      }
    });
  });

  describe("setOrderStatus", () => {
    it("changes the status, and the Client's own orders show it", async () => {
      await asAdmin();
      expect(await actions.setOrderStatus("D-1048", "delivered")).toEqual({
        ok: true,
        status: "delivered",
      });
      const [order] = await db
        .select()
        .from(schema.order)
        .where(eq(schema.order.number, "D-1048"));
      expect(order?.status).toBe("delivered");
      const queries = await import("@/server/account/queries");
      const [client] = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, clientEmail));
      const mine = await queries.listOrders(client!.id, "en");
      expect(mine.find((o) => o.number === "D-1048")?.status).toBe("delivered");
      expect(request.revalidated).toContain("/[locale]/account#layout");

      await actions.setOrderStatus("D-1048", "in_progress");
    });

    it("refuses an unknown order, a bad number and a status the schema does not know", async () => {
      await asAdmin();
      expect(await actions.setOrderStatus("D-9999", "delivered")).toEqual({
        ok: false,
        code: "not-found",
      });
      for (const [number, status] of [
        ["bad", "delivered"],
        ["D-1048", "cancelled"],
        ["D-1048", undefined],
        [undefined, "delivered"],
        ['D-1048\'; drop table "order";--', "delivered"],
      ] as const) {
        expect(await actions.setOrderStatus(number, status)).toEqual({
          ok: false,
          code: "invalid",
        });
      }
    });
  });

  describe("sign-in of an admin is still needed: a stale cookie is a guest", () => {
    it("an invalid cookie does not pass the guard", async () => {
      asBrowser({
        cookie: "stone.session_token=forged.value",
        path: "/ru/admin",
      });
      const error = await thrown(() =>
        actions.setProductPublished("black-marble", false),
      );
      expect(redirectTarget(error)).toBe("/ru/sign-in?next=%2Fru%2Fadmin");
    });
  });
});
