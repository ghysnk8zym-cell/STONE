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
const request = vi.hoisted(() => ({
  headers: new Headers(),
  revalidated: [] as string[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => request.revalidated.push(path),
}));
function asBrowser(cookie?: string) {
  request.headers = new Headers({
    origin: TEST_BASE_URL,
    host: new URL(TEST_BASE_URL).host,
    "x-forwarded-for": nextTestIp(),
    "x-stone-path": "/en/admin/create-your-stone",
  });
  if (cookie) request.headers.set("cookie", cookie);
  request.revalidated = [];
}
function reset() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

describe("Create Your Stone (real PGlite and Better Auth)", () => {
  let actions: typeof import("@/server/admin/stone-request-actions");
  let queries: typeof import("@/server/admin/stone-request-queries");
  let seed: typeof import("@/server/db/seed");
  let schema: typeof import("@/server/db/schema");
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let adminCookie: string;
  let clientCookie: string;
  let clientId: string;
  const row = async () =>
    (
      await db
        .select()
        .from(schema.stoneRequest)
        .where(eq(schema.stoneRequest.number, "Q-1048"))
    )[0]!;
  beforeAll(async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/admin/stone-request-actions");
    queries = await import("@/server/admin/stone-request-queries");
    schema = await import("@/server/db/schema");
    seed = await import("@/server/db/seed");
    db = (await (await import("@/server/db")).getDb())!;
    const auth = (await (await import("@/server/auth/auth")).getAuth())!;
    for (const email of ["admin@example.test", "client@example.test"])
      expect(
        (
          await signUp(auth, email, {
            name: email.startsWith("admin") ? "Admin" : "Client 100%_literal",
          })
        ).status,
      ).toBe(200);
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.email, "admin@example.test"));
    clientId = (
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, "client@example.test"))
    )[0]!.id;
    adminCookie = sessionCookieFrom(
      await signIn(auth, "admin@example.test", TEST_PASSWORD),
    )!;
    clientCookie = sessionCookieFrom(
      await signIn(auth, "client@example.test", TEST_PASSWORD),
    )!;
    await seed.seedCatalog(db);
    await seed.seedAccountData(db, "client@example.test");
  }, 60_000);
  beforeEach(async () => {
    await db.delete(schema.stoneRequest); // this suite's in-memory database only
    await seed.seedStoneRequests(db, "client@example.test");
    asBrowser(adminCookie);
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  for (const role of ["Guest", "Client"] as const)
    it(`${role} cannot read requests/summary or invoke either action, even with malformed input`, async () => {
      asBrowser(role === "Guest" ? undefined : clientCookie);
      for (const call of [
        () => queries.getAdminStoneRequests("en"),
        () => queries.getAdminStoneRequestsSummary("en"),
        () => actions.saveStoneRequestQuote(null),
        () => actions.setStoneRequestStatus(null),
      ]) {
        const error = await thrown(call);
        if (role === "Guest")
          expect(redirectTarget(error)).toBe(
            "/en/sign-in?next=%2Fen%2Fadmin%2Fcreate-your-stone",
          );
        else expect(isNotFound(error)).toBe(true);
      }
      expect(request.revalidated).toEqual([]);
    });
  it("returns localized snapshots and only explicit customer details; does not join mutable catalog prices/titles", async () => {
    const en = await queries.getAdminStoneRequests("en");
    expect(en.total).toBe(3);
    expect(en.requests.map((r) => r.number)).toEqual([
      "Q-1048",
      "Q-1047",
      "Q-1046",
    ]);
    expect(en.selected).toMatchObject({
      name: "Grey Marble",
      quantity: 12,
      quoteUnitPriceCents: null,
      status: "new",
      revision: 0,
      customer: { id: clientId, email: "client@example.test" },
    });
    expect(Object.keys(en.selected!.customer).sort()).toEqual([
      "email",
      "id",
      "name",
    ]);
    const ru = await queries.getAdminStoneRequests("ru");
    expect(ru.selected!.name).toBe("Серый мрамор");
    const before = en.selected;
    await db
      .update(schema.product)
      .set({ priceCents: 99 })
      .where(eq(schema.product.slug, "grey-marble"));
    expect((await queries.getAdminStoneRequests("en")).selected).toEqual(
      before,
    );
  });
  it("searches literal number/customer/name, filters the list and retains an explicitly selected request outside filters", async () => {
    expect(
      (await queries.getAdminStoneRequests("en", { q: "%_literal" })).total,
    ).toBe(3);
    expect(
      (await queries.getAdminStoneRequests("en", { q: "missing%" })).total,
    ).toBe(0);
    expect(
      (await queries.getAdminStoneRequests("en", { q: "Q-1047" })).selected!
        .number,
    ).toBe("Q-1047");
    const draft = await queries.getAdminStoneRequests("en", {
      status: "draft_quote",
      page: 900,
      request: (await row()).id,
    });
    expect(draft.total).toBe(1);
    expect(draft.selected!.number).toBe("Q-1048");
    expect(draft.page).toBe(1);
    expect(
      (
        await queries.getAdminStoneRequests("en", {
          status: "invalid",
          page: NaN,
          q: "a".repeat(200),
        })
      ).q,
    ).toHaveLength(100);
  });
  it("bounds pages to 50 with stable ordering and limits Overview to the latest three", async () => {
    const before = await row();
    await db.insert(schema.stoneRequest).values(
      Array.from({ length: 55 }, (_, i) => ({
        ...before,
        id: undefined,
        number: `Q-${3000 + i}`,
        createdAt: new Date("2026-10-11T00:00:00Z"),
      })),
    );
    const first = await queries.getAdminStoneRequests("en");
    const last = await queries.getAdminStoneRequests("en", { page: 99 });
    expect(first.requests).toHaveLength(50);
    expect(first.requests[0]!.number).toBe("Q-3054");
    expect(first.total).toBe(58);
    expect(last.requests).toHaveLength(8);
    expect(last.page).toBe(2);
    expect(
      new Set([...first.requests, ...last.requests].map((r) => r.id)).size,
    ).toBe(58);
    const summary = await queries.getAdminStoneRequestsSummary("en");
    expect(summary.total).toBe(58);
    expect(summary.requests.map((r) => r.number)).toEqual([
      "Q-3054",
      "Q-3053",
      "Q-3052",
    ]);
  });
  it("keeps an explicitly selected request after its saved status leaves the filter and ignores malformed selection IDs", async () => {
    const before = await row();
    await actions.saveStoneRequestQuote({
      id: before.id,
      revision: 0,
      quoteUnitPriceCents: 6500,
    });
    const data = await queries.getAdminStoneRequests("en", {
      status: "new",
      request: before.id,
    });
    expect(data.requests).toHaveLength(0);
    expect(data.selected!.id).toBe(before.id);
    expect(data.selected!.status).toBe("draft_quote");
    expect(
      (await queries.getAdminStoneRequests("en", { request: "invalid-uuid" }))
        .selected!.id,
    ).toBe(before.id);
  });
  it("saves per-piece quote atomically, marks draft and advances the revision while preserving request/customer/order data", async () => {
    const before = await row();
    const orders = await db.select().from(schema.order);
    expect(
      await actions.saveStoneRequestQuote({
        id: before.id,
        revision: 0,
        quoteUnitPriceCents: 6500,
      }),
    ).toEqual({
      ok: true,
      snapshot: {
        revision: 1,
        status: "draft_quote",
        quoteUnitPriceCents: 6500,
      },
    });
    const after = await row();
    expect({
      ...after,
      revision: before.revision,
      status: before.status,
      quoteUnitPriceCents: before.quoteUnitPriceCents,
      updatedAt: before.updatedAt,
    }).toEqual(before);
    expect(await db.select().from(schema.order)).toEqual(orders);
    expect(request.revalidated).toContain("/[locale]/admin");
    expect(
      await actions.setStoneRequestStatus({
        id: before.id,
        revision: 1,
        status: "awaiting_payment",
      }),
    ).toMatchObject({
      ok: true,
      snapshot: { revision: 2, status: "awaiting_payment" },
    });
    expect(
      await actions.saveStoneRequestQuote({
        id: before.id,
        revision: 2,
        quoteUnitPriceCents: 0,
      }),
    ).toMatchObject({
      ok: true,
      snapshot: { revision: 3, status: "draft_quote", quoteUnitPriceCents: 0 },
    });
  });
  it.each([-1, 0.1, 10_000_001, Infinity, NaN, "6500", null])(
    "rejects malformed or out-of-range quote %s without writes",
    async (value) => {
      const before = await row();
      expect(
        await actions.saveStoneRequestQuote({
          id: before.id,
          revision: 0,
          quoteUnitPriceCents: value,
        }),
      ).toEqual({ ok: false, code: "invalid" });
      expect(await row()).toEqual(before);
      expect(request.revalidated).toEqual([]);
    },
  );
  it("rejects mass assignment, bad IDs/revisions/statuses and quote-less non-New status", async () => {
    const before = await row();
    for (const input of [
      {
        id: before.id,
        revision: 0,
        quoteUnitPriceCents: 500,
        userId: "elsewhere",
      },
      { id: before.id, revision: 2147483647, quoteUnitPriceCents: 500 },
      { id: "bad", revision: 0, quoteUnitPriceCents: 500 },
    ])
      expect(await actions.saveStoneRequestQuote(input)).toEqual({
        ok: false,
        code: "invalid",
      });
    expect(
      await actions.setStoneRequestStatus({
        id: before.id,
        revision: 0,
        status: "paid",
      }),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await actions.setStoneRequestStatus({
        id: before.id,
        revision: 0,
        status: "awaiting_payment",
      }),
    ).toEqual({ ok: false, code: "quote-required" });
    expect(await row()).toEqual(before);
  });
  it("shares revision protection across competing quote and status updates; stale writes cannot overwrite", async () => {
    const before = await row();
    const results = await Promise.all([
      actions.saveStoneRequestQuote({
        id: before.id,
        revision: 0,
        quoteUnitPriceCents: 100,
      }),
      actions.setStoneRequestStatus({
        id: before.id,
        revision: 0,
        status: "new",
      }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, code: "conflict" },
    ]);
    expect((await row()).revision).toBe(1);
    const saved = await row();
    expect(
      await actions.saveStoneRequestQuote({
        id: before.id,
        revision: 0,
        quoteUnitPriceCents: 999,
      }),
    ).toEqual({ ok: false, code: "conflict" });
    expect(await row()).toEqual(saved);
  });
  it("returns not-found for absent records and fails closed at the revision ceiling", async () => {
    const missing = "00000000-0000-4000-8000-000000000001";
    expect(
      await actions.saveStoneRequestQuote({
        id: missing,
        revision: 0,
        quoteUnitPriceCents: 50,
      }),
    ).toEqual({ ok: false, code: "not-found" });
    const before = await row();
    await db
      .update(schema.stoneRequest)
      .set({ revision: 2147483647 })
      .where(eq(schema.stoneRequest.id, before.id));
    expect(
      await actions.saveStoneRequestQuote({
        id: before.id,
        revision: 2147483646,
        quoteUnitPriceCents: 50,
      }),
    ).toEqual({ ok: false, code: "conflict" });
    expect((await row()).quoteUnitPriceCents).toBeNull();
  });
  it("seed skips a missing client and never changes an existing request, including its owner, quote and status", async () => {
    const before = await row();
    await actions.saveStoneRequestQuote({
      id: before.id,
      revision: 0,
      quoteUnitPriceCents: 7654,
    });
    const edited = await row();
    expect(await seed.seedStoneRequests(db, "missing@example.test")).toBe(0);
    expect(await seed.seedStoneRequests(db, "client@example.test")).toBe(3);
    expect(await row()).toEqual(edited);
    await seed.seedStoneRequests(db, "admin@example.test");
    expect(await row()).toEqual(edited);
  });
  it("latest-three Overview summary reflects saved status without changing order revenue and handles empty data", async () => {
    const before = await row();
    const overview = await import("@/server/admin/queries");
    const revenue = (await overview.getAdminOverview("en")).revenueCents;
    await actions.saveStoneRequestQuote({
      id: before.id,
      revision: 0,
      quoteUnitPriceCents: 6500,
    });
    const summary = await queries.getAdminStoneRequestsSummary("en");
    expect(summary.total).toBe(3);
    expect(summary.requests).toHaveLength(3);
    expect(summary.requests[0]!.status).toBe("draft_quote");
    expect((await overview.getAdminOverview("en")).revenueCents).toBe(revenue);
    await db.delete(schema.stoneRequest);
    expect(await queries.getAdminStoneRequestsSummary("en")).toEqual({
      total: 0,
      requests: [],
    });
    expect((await queries.getAdminStoneRequests("en")).selected).toBeNull();
  });
  it("rejects invalid database quantity/price/status combinations and never renders an arbitrary reference URL", async () => {
    const before = await row();
    await expect(
      db
        .update(schema.stoneRequest)
        .set({ quantity: 0 })
        .where(eq(schema.stoneRequest.id, before.id)),
    ).rejects.toThrow();
    await expect(
      db
        .update(schema.stoneRequest)
        .set({ status: "awaiting_payment" })
        .where(eq(schema.stoneRequest.id, before.id)),
    ).rejects.toThrow();
    await db
      .update(schema.stoneRequest)
      .set({ referenceImage: "https://example.test/private.svg" })
      .where(eq(schema.stoneRequest.id, before.id));
    expect(
      (await queries.getAdminStoneRequests("en")).selected!.referenceImage,
    ).toBeNull();
    await expect(
      db.delete(schema.user).where(eq(schema.user.id, clientId)),
    ).rejects.toThrow();
  });
});
