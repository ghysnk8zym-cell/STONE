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
    "x-stone-path": "/en/admin/customers",
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

describe("Customers (real PGlite and Better Auth)", () => {
  let actions: typeof import("@/server/admin/customer-actions");
  let queries: typeof import("@/server/admin/customer-queries");
  let schema: typeof import("@/server/db/schema");
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let adminCookie: string;
  let clientCookie: string;
  let adminId: string;
  let clientId: string;

  beforeAll(async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/admin/customer-actions");
    queries = await import("@/server/admin/customer-queries");
    schema = await import("@/server/db/schema");
    db = (await (await import("@/server/db")).getDb())!;
    const auth = (await (await import("@/server/auth/auth")).getAuth())!;
    for (const [email, name] of [
      ["admin@example.test", "Admin"],
      ["client@example.test", "Client 100%_literal"],
    ]) {
      expect((await signUp(auth, email!, { name: name! })).status).toBe(200);
    }
    const users = await db.select().from(schema.user);
    adminId = users.find((u) => u.email === "admin@example.test")!.id;
    clientId = users.find((u) => u.email === "client@example.test")!.id;
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.id, adminId));
    adminCookie = sessionCookieFrom(
      await signIn(auth, "admin@example.test", TEST_PASSWORD),
    )!;
    clientCookie = sessionCookieFrom(
      await signIn(auth, "client@example.test", TEST_PASSWORD),
    )!;
    const seed = await import("@/server/db/seed");
    await seed.seedCatalog(db);
    await seed.seedAccountData(db, "client@example.test");
  }, 60_000);
  beforeEach(async () => {
    await db
      .update(schema.user)
      .set({ role: "client" })
      .where(eq(schema.user.id, clientId));
    asBrowser(adminCookie);
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  for (const role of ["Guest", "Client"] as const) {
    it(`${role} cannot query personal data or call the action, even with garbage input`, async () => {
      asBrowser(role === "Guest" ? undefined : clientCookie);
      for (const call of [
        () => queries.getAdminCustomers("en", { q: "" }),
        () => actions.setCustomerRole(null, {}),
      ]) {
        const error = await thrown(call);
        if (role === "Guest")
          expect(redirectTarget(error)).toBe(
            "/en/sign-in?next=%2Fen%2Fadmin%2Fcustomers",
          );
        else expect(isNotFound(error)).toBe(true);
      }
      expect(request.revalidated).toEqual([]);
    });
  }

  it.each(["client", "admin"])(
    "rejects changing one's own role to %s",
    async (role) => {
      expect(await actions.setCustomerRole(adminId, role)).toEqual({
        ok: false,
        code: "self",
      });
      expect(
        (
          await db.select().from(schema.user).where(eq(schema.user.id, adminId))
        )[0]!.role,
      ).toBe("admin");
      expect(request.revalidated).toEqual([]);
    },
  );

  it.each([
    ["", "admin"],
    [null, "admin"],
    ["x".repeat(129), "admin"],
    ["target", "owner"],
    ["target", { role: "admin" }],
  ])("rejects malformed id/role (%j, %j)", async (id, role) => {
    expect(await actions.setCustomerRole(id, role)).toEqual({
      ok: false,
      code: "invalid",
    });
    expect(request.revalidated).toEqual([]);
  });

  it("reports a missing target without invalidating pages", async () => {
    expect(await actions.setCustomerRole("missing", "admin")).toEqual({
      ok: false,
      code: "not-found",
    });
    expect(request.revalidated).toEqual([]);
  });

  it("promotes/demotes explicitly, preserves account data and enforces the new role on the existing cookie", async () => {
    const [before] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, clientId));
    const accounts = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, clientId));
    expect(await actions.setCustomerRole(clientId, "admin")).toEqual({
      ok: true,
      role: "admin",
    });
    expect(request.revalidated).toEqual(
      expect.arrayContaining(["/[locale]/admin", "/[locale]/account"]),
    );
    asBrowser(clientCookie);
    expect(
      (await queries.getAdminCustomers("en", { q: "client@" })).selected?.role,
    ).toBe("admin");
    asBrowser(adminCookie);
    expect(await actions.setCustomerRole(clientId, "client")).toEqual({
      ok: true,
      role: "client",
    });
    asBrowser(clientCookie);
    expect(
      isNotFound(
        await thrown(() => actions.setCustomerRole(adminId, "client")),
      ),
    ).toBe(true);
    const [after] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, clientId));
    expect(after).toEqual({ ...before, updatedAt: after!.updatedAt });
    expect(
      await db
        .select()
        .from(schema.account)
        .where(eq(schema.account.userId, clientId)),
    ).toEqual(accounts);
  });

  it("searches literal case-insensitive name/email and returns only an explicit safe customer DTO", async () => {
    for (const q of ["100%_", "CLIENT@EXAMPLE"]) {
      const result = await queries.getAdminCustomers("en", { q });
      expect(result.customers).toHaveLength(1);
      expect(Object.keys(result.customers[0]!).sort()).toEqual([
        "email",
        "id",
        "name",
        "role",
        "thumbnail",
      ]);
      expect(result.selected?.id).toBe(clientId);
      expect(result.orders.length).toBeGreaterThan(0);
    }
    const none = await queries.getAdminCustomers("en", { q: "does-not-exist" });
    expect(none).toMatchObject({
      customers: [],
      selected: null,
      orders: [],
      total: 0,
    });
  });

  it("scopes orders to the selected customer and ignores selection outside the search results", async () => {
    const own = await queries.getAdminCustomers("en", { customer: adminId });
    expect(own.selected?.id).toBe(adminId);
    expect(own.orders).toEqual([]);
    const filtered = await queries.getAdminCustomers("ru", {
      q: "client@",
      customer: adminId,
    });
    expect(filtered.selected?.id).toBe(clientId);
    expect(
      filtered.orders.every((o) => o.customer.email === "client@example.test"),
    ).toBe(true);
    const en = await queries.getAdminCustomers("en", { customer: clientId });
    expect(filtered.orders[0]!.items[0]!.name).not.toBe(
      en.orders[0]!.items[0]!.name,
    );
  });

  it("paginates beyond 50 records and clamps invalid/out-of-range pages", async () => {
    await db.insert(schema.user).values(
      Array.from({ length: 51 }, (_, i) => ({
        id: `paged-${i}`,
        name: `Paged ${String(i).padStart(2, "0")}`,
        email: `paged-${i}@example.test`,
      })),
    );
    const first = await queries.getAdminCustomers("en", {
      q: "Paged",
      page: -9,
    });
    const second = await queries.getAdminCustomers("en", {
      q: "Paged",
      page: 99,
    });
    expect(first).toMatchObject({ total: 51, page: 1, pages: 2 });
    expect(first.customers).toHaveLength(50);
    expect(second).toMatchObject({ total: 51, page: 2, pages: 2 });
    expect(second.customers).toHaveLength(1);
    expect(
      new Set([...first.customers, ...second.customers].map((c) => c.id)).size,
    ).toBe(51);
  });
});
