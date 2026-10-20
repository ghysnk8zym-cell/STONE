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
  TEST_BASE_URL,
  TEST_PASSWORD,
  TEST_SECRET,
  redirectTarget,
  sessionCookieFrom,
  signIn,
  signUp,
  thrown,
} from "./auth-helpers";

vi.mock("server-only", () => ({}));
const browser = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => browser.headers,
  cookies: async () => ({ getAll: () => [] }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function reset() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

describe("cart maths (shared, client-safe)", () => {
  it("rounds a line like the calculator: round(area hundredths x cents / 100)", async () => {
    const { lineTotalCents } = await import("@/features/cart/input");
    expect(lineTotalCents(220, 24000)).toBe(52800);
    expect(lineTotalCents(1, 24000)).toBe(240);
    // 0.01 m2 x $0.50 = 0.5 cent -> half up
    expect(lineTotalCents(1, 50)).toBe(1);
    expect(lineTotalCents(1_000_000, 24000)).toBe(240_000_000);
  });

  it("parses an area with comma or dot into hundredths within 0.01 - 10 000 m2", async () => {
    const { parseArea } = await import("@/features/cart/input");
    expect(parseArea("2,2")).toEqual({ ok: true, hundredths: 220 });
    expect(parseArea("2.205")).toEqual({ ok: true, hundredths: 221 });
    expect(parseArea("10 000")).toEqual({ ok: true, hundredths: 1_000_000 });
    expect(parseArea("abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parseArea("0")).toEqual({ ok: false, reason: "range" });
    expect(parseArea("10000,01")).toEqual({ ok: false, reason: "range" });
  });

  it("merges lines by slug, adding the area and capping it at 10 000 m2", async () => {
    const { addLine, mergeLines } = await import("@/features/cart/input");
    expect(
      addLine([{ slug: "a", areaHundredths: 100 }], {
        slug: "a",
        areaHundredths: 50,
      }),
    ).toEqual([{ slug: "a", areaHundredths: 150 }]);
    expect(
      addLine([{ slug: "a", areaHundredths: 999_999 }], {
        slug: "a",
        areaHundredths: 50,
      }),
    ).toEqual([{ slug: "a", areaHundredths: 1_000_000 }]);
    expect(
      mergeLines([
        { slug: "a", areaHundredths: 1 },
        { slug: "b", areaHundredths: 2 },
        { slug: "a", areaHundredths: 3 },
      ]),
    ).toEqual([
      { slug: "a", areaHundredths: 4 },
      { slug: "b", areaHundredths: 2 },
    ]);
  });

  it("reads only well-formed stored carts (at most 20 lines)", async () => {
    const { parseStoredCart } = await import("@/features/cart/input");
    expect(parseStoredCart("not json")).toEqual([]);
    expect(
      parseStoredCart(
        JSON.stringify([
          { slug: "black-marble", areaHundredths: 220 },
          { slug: "BAD SLUG", areaHundredths: 1 },
          { slug: "x", areaHundredths: 0 },
          { slug: "y", areaHundredths: 1.5 },
        ]),
      ),
    ).toEqual([{ slug: "black-marble", areaHundredths: 220 }]);
    const many = Array.from({ length: 30 }, (_, i) => ({
      slug: `s-${i}`,
      areaHundredths: 1,
    }));
    expect(parseStoredCart(JSON.stringify(many))).toHaveLength(20);
  });
});

describe("test checkout: real local database and authorization", () => {
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let schema: typeof import("@/server/db/schema");
  let actions: typeof import("@/server/shop/actions");
  let queries: typeof import("@/server/shop/queries");
  let client: string, other: string;
  let owner: string;
  let price: number;
  const as = (cookie?: string) => {
    browser.headers = new Headers({
      origin: TEST_BASE_URL,
      host: new URL(TEST_BASE_URL).host,
      "x-stone-path": "/en/checkout",
    });
    if (cookie) browser.headers.set("cookie", cookie);
  };
  const items = [{ slug: "black-marble", areaHundredths: 220 }];
  const order = (key = crypto.randomUUID(), expected = (220 * price) / 100) =>
    actions.placeTestOrder({
      items,
      key,
      expectedTotalCents: Math.round(expected),
    });

  beforeAll(async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/shop/actions");
    queries = await import("@/server/shop/queries");
    schema = await import("@/server/db/schema");
    db = (await (await import("@/server/db")).getDb())!;
    await (await import("@/server/db/seed")).seedCatalog(db);
    const auth = (await (await import("@/server/auth/auth")).getAuth())!;
    for (const email of ["shop@example.test", "shop-other@example.test"])
      expect((await signUp(auth, email)).status).toBe(200);
    client = sessionCookieFrom(
      await signIn(auth, "shop@example.test", TEST_PASSWORD),
    )!;
    other = sessionCookieFrom(
      await signIn(auth, "shop-other@example.test", TEST_PASSWORD),
    )!;
    owner = (
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, "shop@example.test"))
    )[0]!.id;
    price = (
      await db
        .select()
        .from(schema.product)
        .where(eq(schema.product.slug, "black-marble"))
    )[0]!.priceCents;
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    as(client);
    await db.delete(schema.orderItem);
    await db.delete(schema.order);
    await db
      .update(schema.product)
      .set({ published: true, priceCents: price })
      .where(eq(schema.product.slug, "black-marble"));
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  it("quotes from the database (public, read-only): names, prices, line totals, total", async () => {
    as();
    const result = await actions.quoteCart(
      [
        { slug: "black-marble", areaHundredths: 220 },
        { slug: "grey-marble", areaHundredths: 105 },
      ],
      "en",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [first, second] = result.quote.lines;
    expect(first).toMatchObject({
      slug: "black-marble",
      available: true,
      name: "Black Marble",
      priceCents: price,
      lineTotalCents: Math.round((220 * price) / 100),
    });
    expect(second?.available).toBe(true);
    expect(result.quote.totalCents).toBe(
      first!.available && second!.available
        ? first!.lineTotalCents + second!.lineTotalCents
        : -1,
    );
    expect(result.quote.orderable).toBe(true);
    expect(await db.select().from(schema.order)).toHaveLength(0);
  });

  it.each([
    [[]],
    [[{ slug: "black-marble", areaHundredths: 0 }]],
    [[{ slug: "black-marble", areaHundredths: 1_000_001 }]],
    [[{ slug: "black-marble", areaHundredths: 1.5 }]],
    [[{ slug: "Black Marble", areaHundredths: 100 }]],
    [[{ slug: "black-marble", areaHundredths: 100, priceCents: 1 }]],
    [
      Array.from({ length: 21 }, (_, i) => ({
        slug: `s-${i}`,
        areaHundredths: 1,
      })),
    ],
    ["nope"],
  ])("rejects an invalid cart %#", async (bad) => {
    expect(await actions.quoteCart(bad as never, "en")).toEqual({
      ok: false,
      code: "invalid",
    });
  });

  it("marks an unpublished or unknown product unavailable and not orderable", async () => {
    await db
      .update(schema.product)
      .set({ published: false })
      .where(eq(schema.product.slug, "black-marble"));
    const result = await actions.quoteCart(
      [
        { slug: "black-marble", areaHundredths: 220 },
        { slug: "no-such-stone", areaHundredths: 100 },
      ],
      "ru",
    );
    expect(result.ok && result.quote.orderable).toBe(false);
    expect(result.ok && result.quote.lines.map((l) => l.available)).toEqual([
      false,
      false,
    ]);
    expect(await order()).toEqual({ ok: false, code: "product_unavailable" });
    expect(await db.select().from(schema.order)).toHaveLength(0);
  });

  it("sends a Guest to sign-in before reading anything, and rejects a forged origin", async () => {
    as();
    expect(
      redirectTarget(await thrown(() => actions.placeTestOrder(null as never))),
    ).toContain("/en/sign-in?");
    as(client);
    browser.headers.set("origin", "https://attacker.example");
    expect(await order()).toEqual({ ok: false, code: "invalid" });
  });

  it("validates the order input", async () => {
    expect(
      await actions.placeTestOrder({
        items,
        key: "not-a-uuid",
        expectedTotalCents: 1,
      }),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await actions.placeTestOrder({
        items: [],
        key: crypto.randomUUID(),
        expectedTotalCents: 0,
      }),
    ).toEqual({ ok: false, code: "empty" });
    expect(
      await actions.placeTestOrder({
        items,
        key: crypto.randomUUID(),
        expectedTotalCents: -1,
      }),
    ).toEqual({ ok: false, code: "invalid" });
  });

  it("persists one test order with the server's prices and returns its number", async () => {
    const result = await order();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.number).toMatch(/^T-\d{4,}$/);
    const [stored] = await db.select().from(schema.order);
    expect(stored).toMatchObject({
      userId: owner,
      kind: "test_checkout",
      status: "in_progress",
      totalCents: Math.round((220 * price) / 100),
      number: result.number,
    });
    const [line] = await db.select().from(schema.orderItem);
    expect(line).toMatchObject({
      quantity: 1,
      areaHundredths: 220,
      priceCents: price,
      lineTotalCents: Math.round((220 * price) / 100),
      finish: "polished",
    });
  });

  it("returns prices_changed with a fresh quote instead of ordering when the price moved", async () => {
    await db
      .update(schema.product)
      .set({ priceCents: price + 100 })
      .where(eq(schema.product.slug, "black-marble"));
    const result = await order();
    expect(result.ok).toBe(false);
    if (result.ok || result.code !== "prices_changed") throw new Error("x");
    expect(result.quote.totalCents).toBe(
      Math.round((220 * (price + 100)) / 100),
    );
    expect(await db.select().from(schema.order)).toHaveLength(0);
    // confirming the fresh total orders
    const again = await order(undefined, result.quote.totalCents);
    expect(again.ok).toBe(true);
  });

  it("is idempotent: the same key twice is one order; the same key with other content conflicts", async () => {
    const key = crypto.randomUUID();
    const first = await order(key);
    expect(first.ok).toBe(true);
    expect(await order(key)).toEqual(first);
    expect(await db.select().from(schema.order)).toHaveLength(1);
    expect(
      await actions.placeTestOrder({
        items: [{ slug: "black-marble", areaHundredths: 300 }],
        key,
        expectedTotalCents: Math.round((300 * price) / 100),
      }),
    ).toEqual({ ok: false, code: "conflict" });
    // a retry after a price change still returns the saved order
    await db
      .update(schema.product)
      .set({ priceCents: price + 1 })
      .where(eq(schema.product.slug, "black-marble"));
    expect(await order(key)).toEqual(first);
  });

  it("concurrent identical submissions create a single order", async () => {
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([order(key), order(key)]);
    expect(a.ok).toBe(true);
    expect(b).toEqual(a);
    expect(await db.select().from(schema.order)).toHaveLength(1);
  });

  it("enforces the per-user demo cap inside the insert", async () => {
    const { TEST_ORDER_CAP } = await import("@/features/cart/input");
    const rows = Array.from({ length: TEST_ORDER_CAP }, (_, i) => ({
      number: `T-${900000 + i}`,
      userId: owner,
      totalCents: 1,
      kind: "test_checkout" as const,
    }));
    await db.insert(schema.order).values(rows);
    expect(await order()).toEqual({ ok: false, code: "limit" });
    expect(await db.select().from(schema.order)).toHaveLength(TEST_ORDER_CAP);
  });

  it("refuses a line or an order total above the Postgres integer range before inserting", async () => {
    const max = { slug: "black-marble", areaHundredths: 1_000_000 };
    await db
      .update(schema.product)
      .set({ priceCents: 300_000 })
      .where(eq(schema.product.slug, "black-marble"));
    const line = await actions.quoteCart([max], "en");
    expect(line.ok && line.quote.tooLarge).toBe(true);
    expect(line.ok && line.quote.orderable).toBe(false);
    expect(
      await actions.placeTestOrder({
        items: [max],
        key: crypto.randomUUID(),
        expectedTotalCents: 0,
      }),
    ).toEqual({ ok: false, code: "too_large" });

    // two lines of $15 000 000 each: every line fits, the sum does not
    const grey = (
      await db
        .select()
        .from(schema.product)
        .where(eq(schema.product.slug, "grey-marble"))
    )[0]!.priceCents;
    await db
      .update(schema.product)
      .set({ priceCents: 150_000 })
      .where(eq(schema.product.slug, "black-marble"));
    await db
      .update(schema.product)
      .set({ priceCents: 150_000 })
      .where(eq(schema.product.slug, "grey-marble"));
    try {
      const both = [max, { slug: "grey-marble", areaHundredths: 1_000_000 }];
      const total = await actions.quoteCart(both, "en");
      expect(total.ok && total.quote.tooLarge).toBe(true);
      expect(
        await actions.placeTestOrder({
          items: both,
          key: crypto.randomUUID(),
          expectedTotalCents: 0,
        }),
      ).toEqual({ ok: false, code: "too_large" });
      expect(await db.select().from(schema.order)).toHaveLength(0);
    } finally {
      await db
        .update(schema.product)
        .set({ priceCents: grey })
        .where(eq(schema.product.slug, "grey-marble"));
    }
  });

  it("keeps the database round trips low (Workers allow 50 subrequests per request)", async () => {
    const slugs = (
      await db.select({ slug: schema.product.slug }).from(schema.product)
    ).map((p) => p.slug);
    expect(slugs.length).toBeGreaterThanOrEqual(12);
    const lines = slugs.map((slug) => ({ slug, areaHundredths: 100 }));
    const client = (db as unknown as { $client: { query: () => unknown } })
      .$client;
    const spy = vi.spyOn(client, "query");
    const quoted = await actions.quoteCart(lines, "en");
    const quoteQueries = spy.mock.calls.length;
    expect(quoted.ok && quoted.quote.orderable).toBe(true);
    expect(quoteQueries).toBeLessThanOrEqual(3);
    spy.mockClear();
    const placed = await actions.placeTestOrder({
      items: lines,
      key: crypto.randomUUID(),
      expectedTotalCents: quoted.ok ? quoted.quote.totalCents : 0,
    });
    expect(placed.ok).toBe(true);
    const orderQueries = spy.mock.calls.length;
    expect(orderQueries).toBeLessThanOrEqual(10);
  });

  it("stores and returns the lines in cart order", async () => {
    const lines = ["grey-marble", "black-marble", "golden-rock", "slate-tile"]
      .filter(Boolean)
      .map((slug, i) => ({ slug, areaHundredths: 100 + i }));
    const known = new Set(
      (await db.select({ slug: schema.product.slug }).from(schema.product)).map(
        (p) => p.slug,
      ),
    );
    const cartLines = lines.filter((l) => known.has(l.slug));
    expect(cartLines.length).toBeGreaterThanOrEqual(3);
    for (let attempt = 0; attempt < 3; attempt++) {
      const quoted = await actions.quoteCart(cartLines, "en");
      const placed = await actions.placeTestOrder({
        items: cartLines,
        key: crypto.randomUUID(),
        expectedTotalCents: quoted.ok ? quoted.quote.totalCents : 0,
      });
      if (!placed.ok) throw new Error("not placed");
      const mine = await queries.getOwnOrder(owner, placed.number, "en");
      expect(mine?.items.map((i) => i.slug)).toEqual(
        cartLines.map((l) => l.slug),
      );
      const account = await (
        await import("@/server/account/queries")
      ).listOrders(owner, "en");
      expect(
        account
          .find((o) => o.number === placed.number)
          ?.items.map((i) => i.slug),
      ).toEqual(cartLines.map((l) => l.slug));
    }
  });

  it("shows an order only to its owner", async () => {
    const placed = await order();
    if (!placed.ok) throw new Error("not placed");
    const mine = await queries.getOwnOrder(owner, placed.number, "en");
    expect(mine).toMatchObject({
      number: placed.number,
      kind: "test_checkout",
      status: "in_progress",
    });
    expect(mine?.items[0]).toMatchObject({
      slug: "black-marble",
      areaHundredths: 220,
      lineTotalCents: Math.round((220 * price) / 100),
    });
    const otherId = (
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, "shop-other@example.test"))
    )[0]!.id;
    expect(await queries.getOwnOrder(otherId, placed.number, "en")).toBeNull();
    expect(await queries.getOwnOrder(owner, "T-1", "en")).toBeNull();
    // the other client cannot recover it with the key either
    as(other);
    expect(await actions.placeTestOrder(null as never)).toEqual({
      ok: false,
      code: "invalid",
    });
  });
});
