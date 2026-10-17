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
  authRequest,
  isNotFound,
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

// The guards read the incoming request through next/headers; the tests play the request.
const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
  }),
}));

function asRequest(init: { cookie?: string; path?: string } = {}) {
  request.headers = new Headers();
  if (init.cookie) request.headers.set("cookie", init.cookie);
  if (init.path) request.headers.set("x-stone-path", init.path);
}

function resetSingletons() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

async function load() {
  const auth = await import("@/server/auth/auth");
  const guards = await import("@/server/auth/guards");
  const session = await import("@/server/auth/session");
  const db = await import("@/server/db");
  return { ...auth, ...guards, ...session, ...db };
}

type Loaded = Awaited<ReturnType<typeof load>>;

describe("guards with a database (PGlite + real Better Auth sessions)", () => {
  let m: Loaded;
  let auth: NonNullable<Awaited<ReturnType<Loaded["getAuth"]>>>;
  const clientEmail = "client@example.test";
  const adminEmail = "admin@example.test";

  beforeAll(async () => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    m = await load();
    const instance = await m.getAuth();
    if (!instance) throw new Error("expected auth with a database");
    auth = instance;
    expect((await signUp(auth, clientEmail)).status).toBe(200);
    await m.createSeedUser(auth, {
      email: adminEmail,
      password: TEST_PASSWORD,
      name: "Admin",
      role: "admin",
    });
    const db = (await m.getDb())!;
    await db
      .update(m.schema.user)
      .set({ role: "admin" })
      .where(eq(m.schema.user.email, adminEmail));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    resetSingletons();
  });

  beforeEach(() => asRequest());

  async function cookieFor(email: string) {
    const cookie = sessionCookieFrom(await signIn(auth, email));
    if (!cookie) throw new Error("expected a session cookie");
    return cookie;
  }

  it("auth is available", () => {
    expect(m.authAvailable()).toBe(true);
  });

  it("no session: requireUser redirects to sign-in with the current path as next", async () => {
    asRequest({ path: "/ru/account/orders" });
    const error = await thrown(() => m.requireUser("ru"));
    expect(redirectTarget(error)).toBe(
      "/ru/sign-in?next=%2Fru%2Faccount%2Forders",
    );
  });

  it("no session: a crafted path header never becomes an external next", async () => {
    asRequest({ path: "//evil.com" });
    const error = await thrown(() => m.requireUser("en"));
    expect(redirectTarget(error)).toBe("/en/sign-in?next=%2Fen%2Faccount");
  });

  it("no session: requireRole redirects to sign-in too", async () => {
    asRequest({ path: "/en/admin" });
    const error = await thrown(() => m.requireRole("admin", "en"));
    expect(redirectTarget(error)).toBe("/en/sign-in?next=%2Fen%2Fadmin");
  });

  it("client: requireUser returns only id, email, name and role", async () => {
    asRequest({ cookie: await cookieFor(clientEmail) });
    const user = await m.requireUser("ru");
    expect(user).toEqual({
      id: expect.any(String),
      email: clientEmail,
      name: "Test User",
      role: "client",
    });
  });

  it("client: requireRole('admin') is a 404 (the admin area is hidden)", async () => {
    asRequest({ cookie: await cookieFor(clientEmail), path: "/ru/admin" });
    const error = await thrown(() => m.requireRole("admin", "ru"));
    expect(isNotFound(error)).toBe(true);
  });

  it("admin: requireRole('admin') returns the admin", async () => {
    asRequest({ cookie: await cookieFor(adminEmail) });
    const user = await m.requireRole("admin", "en");
    expect(user).toMatchObject({ email: adminEmail, role: "admin" });
  });

  it("getSession returns the session user, or null without a cookie", async () => {
    expect(await m.getSession()).toBeNull();
    asRequest({ cookie: await cookieFor(clientEmail) });
    expect(await m.getSession()).toEqual({
      user: {
        id: expect.any(String),
        email: clientEmail,
        name: "Test User",
        role: "client",
      },
    });
  });

  it("expired session: requireUser redirects to sign-in", async () => {
    const cookie = await cookieFor(clientEmail);
    const token = decodeURIComponent(cookie.split("=")[1]!).split(".")[0]!;
    const db = (await m.getDb())!;
    await db
      .update(m.schema.session)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(m.schema.session.token, token));
    asRequest({ cookie, path: "/ru/account" });
    const error = await thrown(() => m.requireUser("ru"));
    expect(redirectTarget(error)).toBe("/ru/sign-in?next=%2Fru%2Faccount");
  });

  it("a forged session cookie is rejected", async () => {
    const [name] = (await cookieFor(clientEmail)).split("=");
    asRequest({ cookie: `${name}=forged.value`, path: "/ru/account" });
    const error = await thrown(() => m.requireUser("ru"));
    expect(redirectTarget(error)).toBe("/ru/sign-in?next=%2Fru%2Faccount");
  });

  it("a role change in the database applies to the next request (no cookie cache)", async () => {
    const email = "demoted@example.test";
    expect((await signUp(auth, email)).status).toBe(200);
    const db = (await m.getDb())!;
    await db
      .update(m.schema.user)
      .set({ role: "admin" })
      .where(eq(m.schema.user.email, email));
    const cookie = await cookieFor(email);
    asRequest({ cookie });
    expect(await m.requireRole("admin", "ru")).toMatchObject({ email });

    await db
      .update(m.schema.user)
      .set({ role: "client" })
      .where(eq(m.schema.user.email, email));
    asRequest({ cookie });
    expect(isNotFound(await thrown(() => m.requireRole("admin", "ru")))).toBe(
      true,
    );
  });

  it("sign-up can never set the role", async () => {
    const email = "sneaky@example.test";
    await signUp(auth, email, { role: "admin" });
    const db = (await m.getDb())!;
    const rows = await db
      .select({ role: m.schema.user.role })
      .from(m.schema.user)
      .where(eq(m.schema.user.email, email));
    expect(rows).toEqual([{ role: "client" }]);
  });

  it("update-user can never set the role", async () => {
    const cookie = await cookieFor(clientEmail);
    const response = await auth.handler(
      authRequest("/update-user", { body: { role: "admin" }, cookie }),
    );
    expect(response.status).toBe(400);
    const db = (await m.getDb())!;
    const rows = await db
      .select({ role: m.schema.user.role })
      .from(m.schema.user)
      .where(eq(m.schema.user.email, clientEmail));
    expect(rows).toEqual([{ role: "client" }]);
  });
});

describe("without a database", () => {
  beforeAll(() => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    resetSingletons();
  });

  it("auth is unavailable and the guards treat everyone as a Guest", async () => {
    const m = await load();
    expect(m.authAvailable()).toBe(false);
    expect(await m.getAuth()).toBeNull();
    asRequest({ cookie: "stone.session_token=whatever", path: "/ru/account" });
    expect(await m.getSession()).toBeNull();
    const error = await thrown(() => m.requireUser("ru"));
    expect(redirectTarget(error)).toBe("/ru/sign-in?next=%2Fru%2Faccount");
  });
});
