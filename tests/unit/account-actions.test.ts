import { and, eq } from "drizzle-orm";
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
  setCookies: [] as { name: string; value: string }[],
  revalidated: [] as string[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => undefined,
    // Like Next: what a server action set earlier in the request is visible to the re-render that follows.
    getAll: () => request.setCookies,
    set: (name: string, value: string) => {
      request.setCookies.push({ name, value });
    },
  }),
}));
// revalidatePath needs Next's runtime store; here it only records the calls.
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    request.revalidated.push(path);
  },
}));

function asBrowser(init: { cookie?: string; path?: string } = {}) {
  request.headers = new Headers({
    origin: TEST_BASE_URL,
    host: new URL(TEST_BASE_URL).host,
    // A distinct client per test: the rate limit is per IP and path.
    "x-forwarded-for": nextTestIp(),
  });
  if (init.cookie) request.headers.set("cookie", init.cookie);
  if (init.path) request.headers.set("x-stone-path", init.path);
  request.setCookies = [];
  request.revalidated = [];
}

function resetSingletons() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

type Actions = typeof import("@/server/account/actions");
type Queries = typeof import("@/server/account/queries");
type Schema = typeof import("@/server/db/schema");

describe("account server actions and queries (PGlite + real Better Auth)", () => {
  let actions: Actions;
  let queries: Queries;
  let schema: Schema;
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let auth: NonNullable<
    Awaited<ReturnType<typeof import("@/server/auth/auth").getAuth>>
  >;
  let me: typeof import("@/app/api/me/route");
  const emailA = "alice@example.test";
  const emailB = "bob@example.test";
  const ids: Record<string, string> = {};
  // Bob's password after the changePassword tests.
  const NEW_PASSWORD = "a-brand-new-test-password-2";

  async function cookieFor(email: string, password = TEST_PASSWORD) {
    const cookie = sessionCookieFrom(await signIn(auth, email, password));
    if (!cookie) throw new Error("expected a session cookie");
    return cookie;
  }

  async function productId(slug: string) {
    const [row] = await db
      .select({ id: schema.product.id })
      .from(schema.product)
      .where(eq(schema.product.slug, slug));
    return row!.id;
  }

  beforeAll(async () => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/account/actions");
    queries = await import("@/server/account/queries");
    schema = await import("@/server/db/schema");
    me = await import("@/app/api/me/route");
    const database = (await import("@/server/db")).getDb;
    db = (await database())!;
    auth = (await (await import("@/server/auth/auth")).getAuth())!;
    await (await import("@/server/db/seed")).seedCatalog(db);

    for (const [key, email] of [
      ["a", emailA],
      ["b", emailB],
    ] as const) {
      expect((await signUp(auth, email, { name: `User ${key}` })).status).toBe(
        200,
      );
      const [row] = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, email));
      ids[key] = row!.id;
    }
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    resetSingletons();
  });

  beforeEach(() => asBrowser());

  describe("toggleFavorite", () => {
    it("rejects without a session (redirect to sign-in with the page as next) and writes nothing", async () => {
      asBrowser({ path: "/ru/catalog/black-marble" });
      const error = await thrown(() => actions.toggleFavorite("black-marble"));
      expect(redirectTarget(error)).toBe(
        "/ru/sign-in?next=%2Fru%2Fcatalog%2Fblack-marble",
      );
      expect(await db.select().from(schema.favorite)).toEqual([]);
    });

    it("toggles on and off for the session user and tells the new state", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      expect(await actions.toggleFavorite("black-marble")).toEqual({
        ok: true,
        favorited: true,
      });
      expect(await queries.listFavoriteSlugs(ids.a!)).toEqual(["black-marble"]);
      expect(await actions.toggleFavorite("black-marble")).toEqual({
        ok: true,
        favorited: false,
      });
      expect(await queries.listFavoriteSlugs(ids.a!)).toEqual([]);
    });

    it("favorites are scoped to the session user", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      await actions.toggleFavorite("grey-marble");
      await actions.toggleFavorite("black-marble");

      // Bob sees none of Alice's favourites, and toggling the same product is his own row.
      expect(await queries.listFavoriteSlugs(ids.b!)).toEqual([]);
      asBrowser({ cookie: await cookieFor(emailB) });
      expect(await actions.toggleFavorite("grey-marble")).toEqual({
        ok: true,
        favorited: true,
      });
      expect(await queries.listFavoriteSlugs(ids.b!)).toEqual(["grey-marble"]);
      // Removing Bob's favourite does not touch Alice's.
      await actions.toggleFavorite("grey-marble");
      expect((await queries.listFavoriteSlugs(ids.a!)).sort()).toEqual([
        "black-marble",
        "grey-marble",
      ]);
      expect(await queries.listFavoriteSlugs(ids.b!)).toEqual([]);

      // Cleanup for the following tests.
      asBrowser({ cookie: await cookieFor(emailA) });
      await actions.toggleFavorite("grey-marble");
      await actions.toggleFavorite("black-marble");
    });

    it("refuses an unknown or unpublished product and bad input", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      expect(await actions.toggleFavorite("no-such-stone")).toEqual({
        ok: false,
        code: "not-found",
      });
      await db
        .update(schema.product)
        .set({ published: false })
        .where(eq(schema.product.slug, "taupe-rock"));
      expect(await actions.toggleFavorite("taupe-rock")).toEqual({
        ok: false,
        code: "not-found",
      });
      await db
        .update(schema.product)
        .set({ published: true })
        .where(eq(schema.product.slug, "taupe-rock"));
      for (const bad of [undefined, null, 42, {}, "", "x".repeat(300)]) {
        expect(await actions.toggleFavorite(bad)).toEqual({
          ok: false,
          code: "invalid",
        });
      }
      expect(await queries.listFavoriteSlugs(ids.a!)).toEqual([]);
    });

    it("with a desired state it is idempotent: add twice stays added, remove twice stays removed", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      expect(await actions.toggleFavorite("black-marble", true)).toEqual({
        ok: true,
        favorited: true,
      });
      expect(await actions.toggleFavorite("black-marble", true)).toEqual({
        ok: true,
        favorited: true,
      });
      expect(await queries.listFavoriteSlugs(ids.a!)).toEqual(["black-marble"]);
      expect(await actions.toggleFavorite("black-marble", false)).toEqual({
        ok: true,
        favorited: false,
      });
      expect(await actions.toggleFavorite("black-marble", false)).toEqual({
        ok: true,
        favorited: false,
      });
      expect(await queries.listFavoriteSlugs(ids.a!)).toEqual([]);
      expect(await actions.toggleFavorite("black-marble", "yes")).toEqual({
        ok: false,
        code: "invalid",
      });
    });

    it("revalidates the account pages so the favourites list is fresh", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      await actions.toggleFavorite("black-marble");
      expect(request.revalidated.length).toBeGreaterThan(0);
      await actions.toggleFavorite("black-marble");
    });
  });

  describe("updateProfileName", () => {
    it("rejects without a session", async () => {
      asBrowser({ path: "/ru/account/profile" });
      const error = await thrown(() => actions.updateProfileName("Eve"));
      expect(redirectTarget(error)).toBe(
        "/ru/sign-in?next=%2Fru%2Faccount%2Fprofile",
      );
    });

    it("saves a trimmed name for the session user only", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      expect(await actions.updateProfileName("  Alice Stone  ")).toEqual({
        ok: true,
        name: "Alice Stone",
      });
      const rows = await db
        .select({ email: schema.user.email, name: schema.user.name })
        .from(schema.user);
      expect(rows.find((r) => r.email === emailA)?.name).toBe("Alice Stone");
      expect(rows.find((r) => r.email === emailB)?.name).toBe("User b");
    });

    it("refuses an empty, too long or non-string name", async () => {
      asBrowser({ cookie: await cookieFor(emailA) });
      for (const bad of [
        "",
        "   ",
        "x".repeat(81),
        7,
        null,
        undefined,
        "two\nlines",
        "tab\there",
        "nul\u0000byte",
        "esc\u001b[31m",
        // invisible formatting: bidi overrides, zero-width characters, BOM, line separators
        "evil\u202etxt.exe",
        "zero\u200bwidth",
        "join\u2060er",
        "b\ufeffom",
        "line\u2028sep",
      ]) {
        expect(await actions.updateProfileName(bad)).toEqual({
          ok: false,
          code: "invalid",
        });
      }
      const [row] = await db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, ids.a!));
      expect(row!.name).toBe("Alice Stone");
    });

    it("never changes the role or the email", async () => {
      asBrowser({ cookie: await cookieFor(emailB) });
      await actions.updateProfileName("Bob");
      const [row] = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, ids.b!));
      expect(row).toMatchObject({ email: emailB, role: "client", name: "Bob" });
    });
  });

  describe("changePassword", () => {
    it("rejects without a session", async () => {
      asBrowser({ path: "/en/account/profile" });
      const error = await thrown(() =>
        actions.changePassword(TEST_PASSWORD, NEW_PASSWORD),
      );
      expect(redirectTarget(error)).toBe(
        "/en/sign-in?next=%2Fen%2Faccount%2Fprofile",
      );
    });

    it("requires the current password and keeps the old one when it is wrong", async () => {
      asBrowser({ cookie: await cookieFor(emailB) });
      expect(
        await actions.changePassword("not-the-current-password", NEW_PASSWORD),
      ).toEqual({ ok: false, code: "invalidCurrent" });
      // The old password still signs in; the new one does not.
      expect((await signIn(auth, emailB, TEST_PASSWORD)).status).toBe(200);
      expect((await signIn(auth, emailB, NEW_PASSWORD)).status).not.toBe(200);
    });

    it("refuses a weak new password before changing anything", async () => {
      asBrowser({ cookie: await cookieFor(emailB) });
      expect(await actions.changePassword(TEST_PASSWORD, "short")).toEqual({
        ok: false,
        code: "weakPassword",
      });
      expect(
        await actions.changePassword(TEST_PASSWORD, "x".repeat(200)),
      ).toEqual({ ok: false, code: "weakPassword" });
      expect((await signIn(auth, emailB, TEST_PASSWORD)).status).toBe(200);
    });

    it("refuses non-string input", async () => {
      asBrowser({ cookie: await cookieFor(emailB) });
      expect(await actions.changePassword(undefined, NEW_PASSWORD)).toEqual({
        ok: false,
        code: "invalid",
      });
      expect(await actions.changePassword(TEST_PASSWORD, 12345678)).toEqual({
        ok: false,
        code: "invalid",
      });
    });

    it("rotates the current session (a new cookie) and ends every other one", async () => {
      // Carol has two devices; she changes the password on the first.
      const email = "carol@example.test";
      expect((await signUp(auth, email, { name: "Carol" })).status).toBe(200);
      const device1 = await cookieFor(email);
      const device2 = await cookieFor(email);
      expect(device2).not.toBe(device1);

      asBrowser({ cookie: device1 });
      expect(await actions.changePassword(TEST_PASSWORD, NEW_PASSWORD)).toEqual(
        { ok: true },
      );
      // A new session cookie was issued for this device ...
      const rotated = request.setCookies.find((c) =>
        /session_token$/.test(c.name),
      );
      expect(rotated).toBeDefined();
      const rotatedCookie = `${rotated!.name}=${encodeURIComponent(rotated!.value)}`;
      expect(rotatedCookie).not.toBe(device1);

      // ... and the re-render that follows the action (same request: the old cookie is still in the request
      // headers, the new one is in the cookie store) still sees the user, instead of bouncing to sign-in.
      const { getSession } = await import("@/server/auth/session");
      expect((await getSession())?.user.email).toBe(email);

      const sessionOf = async (cookie: string) => {
        asBrowser({ cookie });
        return (await getSession())?.user.email;
      };
      expect(await sessionOf(rotatedCookie)).toBe(email); // the new session works
      expect(await sessionOf(device1)).toBeUndefined(); // the old token of this device is gone
      expect(await sessionOf(device2)).toBeUndefined(); // so is every other device
    });

    it("changes the password with the right current one and returns no token", async () => {
      asBrowser({ cookie: await cookieFor(emailB) });
      const result = await actions.changePassword(TEST_PASSWORD, NEW_PASSWORD);
      expect(result).toEqual({ ok: true });
      expect(JSON.stringify(result).toLowerCase()).not.toContain("token");
      expect((await signIn(auth, emailB, NEW_PASSWORD)).status).toBe(200);
      expect((await signIn(auth, emailB, TEST_PASSWORD)).status).not.toBe(200);
    });
  });

  describe("account queries", () => {
    beforeAll(async () => {
      // Two orders for Alice (the Figma demo rows) and one for Bob.
      const black = await productId("black-marble");
      const limestone = await productId("grey-limestone");
      const insert = async (
        userId: string,
        number: string,
        status: string,
        totalCents: number,
        createdAt: Date,
        productRef: string,
        finish: string,
        quantity: number,
      ) => {
        const [order] = await db
          .insert(schema.order)
          .values({ number, userId, status, totalCents, createdAt })
          .returning({ id: schema.order.id });
        await db.insert(schema.orderItem).values({
          orderId: order!.id,
          productId: productRef,
          finish,
          quantity,
          priceCents: totalCents,
        });
      };
      await insert(
        ids.a!,
        "T-1001",
        "delivered",
        38400,
        new Date("2026-09-12T09:00:00Z"),
        limestone,
        "honed",
        2,
      );
      await insert(
        ids.a!,
        "T-1002",
        "in_progress",
        24000,
        new Date("2026-10-05T09:00:00Z"),
        black,
        "polished",
        1,
      );
      await insert(
        ids.a!,
        "T-1000",
        "delivered",
        1000,
        new Date("2026-08-01T09:00:00Z"),
        black,
        "polished",
        1,
      );
      await insert(
        ids.b!,
        "T-2001",
        "in_progress",
        5000,
        new Date("2026-10-06T09:00:00Z"),
        black,
        "polished",
        1,
      );
      // Favourites inserted straight into the table, oldest first.
      for (const [slug, day] of [
        ["black-marble", 1],
        ["grey-limestone", 2],
        ["grey-marble", 3],
        ["golden-rock", 4],
      ] as const) {
        await db.insert(schema.favorite).values({
          userId: ids.a!,
          productId: await productId(slug),
          createdAt: new Date(`2026-10-0${day}T09:00:00Z`),
        });
      }
    });

    it("listOrders returns only the user's orders, newest first, with their items", async () => {
      const orders = await queries.listOrders(ids.a!, "en");
      expect(orders.map((o) => o.number)).toEqual([
        "T-1002",
        "T-1001",
        "T-1000",
      ]);
      expect(orders[0]).toMatchObject({
        status: "in_progress",
        totalCents: 24000,
        items: [
          {
            slug: "black-marble",
            finish: "polished",
            quantity: 1,
            name: "Black Marble",
          },
        ],
      });
      const bobs = await queries.listOrders(ids.b!, "en");
      expect(bobs.map((o) => o.number)).toEqual(["T-2001"]);
    });

    it("listFavorites returns the user's favourites, newest first, with localised names", async () => {
      const ru = await queries.listFavorites(ids.a!, "ru");
      expect(ru.map((f) => f.slug)).toEqual([
        "golden-rock",
        "grey-marble",
        "grey-limestone",
        "black-marble",
      ]);
      expect(ru[3]).toMatchObject({
        slug: "black-marble",
        material: "marble",
        image: "images/catalog/black-marble",
        name: "Чёрный мрамор",
      });
      expect(await queries.listFavorites(ids.b!, "ru")).toEqual([]);
    });

    it("hides unpublished products from favourites", async () => {
      await db
        .update(schema.product)
        .set({ published: false })
        .where(eq(schema.product.slug, "golden-rock"));
      expect(
        (await queries.listFavorites(ids.a!, "en")).map((f) => f.slug),
      ).not.toContain("golden-rock");
      expect(await queries.listFavoriteSlugs(ids.a!)).not.toContain(
        "golden-rock",
      );
      await db
        .update(schema.product)
        .set({ published: true })
        .where(eq(schema.product.slug, "golden-rock"));
    });

    it("getAccountOverview gives the two latest orders, three favourites and the discounted offers", async () => {
      const overview = await queries.getAccountOverview(ids.a!, "en");
      expect(overview.orders.map((o) => o.number)).toEqual([
        "T-1002",
        "T-1001",
      ]);
      expect(overview.favorites.map((f) => f.slug)).toEqual([
        "golden-rock",
        "grey-marble",
        "grey-limestone",
      ]);
      expect(overview.offers.length).toBeGreaterThan(0);
      for (const offer of overview.offers) {
        expect(offer.slug).toBeTruthy();
      }
    });
  });

  describe("GET /api/me", () => {
    it("answers a Guest with signedIn false and nothing else, uncached", async () => {
      asBrowser();
      const response = await me.GET();
      expect(response.headers.get("cache-control")).toMatch(/no-store/);
      expect(await response.json()).toEqual({
        signedIn: false,
        name: null,
        favorites: [],
      });
    });

    it("answers a signed-in user with their name and favourite slugs, never an id or email", async () => {
      asBrowser({ cookie: await cookieFor(emailB, NEW_PASSWORD) });
      await actions.toggleFavorite("black-marble");
      const response = await me.GET();
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toEqual({
        signedIn: true,
        name: "Bob",
        favorites: ["black-marble"],
      });
      const text = JSON.stringify(body);
      expect(text).not.toContain(emailB);
      expect(text).not.toContain(ids.b!);
      await actions.toggleFavorite("black-marble");
    });

    it("answers a forged cookie like a Guest", async () => {
      const [name] = (await cookieFor(emailA)).split("=");
      asBrowser({ cookie: `${name}=forged.value` });
      const body = await (await me.GET()).json();
      expect(body.signedIn).toBe(false);
    });
  });

  it("deleting a user's favourite row via the table keeps the scoping key intact", async () => {
    // Sanity check of the schema the scoping relies on: (user, product) is the primary key.
    const black = await productId("black-marble");
    await db
      .insert(schema.favorite)
      .values({ userId: ids.b!, productId: black })
      .onConflictDoNothing();
    await db
      .insert(schema.favorite)
      .values({ userId: ids.b!, productId: black })
      .onConflictDoNothing();
    const rows = await db
      .select()
      .from(schema.favorite)
      .where(
        and(
          eq(schema.favorite.userId, ids.b!),
          eq(schema.favorite.productId, black),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});

describe("account actions without a database", () => {
  it("send a Guest to sign-in (no session can exist)", async () => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const actions = await import("@/server/account/actions");
    asBrowser({ path: "/ru/catalog" });
    const error = await thrown(() => actions.toggleFavorite("black-marble"));
    expect(redirectTarget(error)).toBe("/ru/sign-in?next=%2Fru%2Fcatalog");
  });

  it("GET /api/me is a Guest answer without touching a database", async () => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const me = await import("@/app/api/me/route");
    asBrowser();
    expect(await (await me.GET()).json()).toEqual({
      signedIn: false,
      name: null,
      favorites: [],
    });
  });
});
