import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  authRequest,
  nextTestIp,
  sessionCookieFrom,
  setCookieLine,
  signIn,
  signUp,
  TEST_BASE_URL,
  TEST_PASSWORD,
  TEST_SECRET,
} from "./auth-helpers";

vi.mock("server-only", () => ({}));

const request = vi.hoisted(() => ({
  headers: new Headers(),
  setCookies: [] as { name: string; value: string; options: unknown }[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: (name: string, value: string, options: unknown) => {
      request.setCookies.push({ name, value, options });
    },
  }),
}));

const { createDb, schema } = await import("@/server/db");
const { authConfigFromEnv, createAuth, createSeedUser, RATE_LIMIT_RULES } =
  await import("@/server/auth/auth");
const { SESSION_COOKIE_NAMES } = await import("@/server/auth/constants");
const { seed } = await import("@/server/db/seed");

async function freshAuth(
  config: Partial<Parameters<typeof createAuth>[1]> = {},
) {
  const db = await createDb("pglite://memory");
  if (!db) throw new Error("expected a database");
  const auth = createAuth(db, {
    secret: TEST_SECRET,
    baseURL: TEST_BASE_URL,
    trustedOrigins: [TEST_BASE_URL],
    secureCookies: false,
    ipAddressHeaders: ["x-forwarded-for"],
    ...config,
  });
  return { db, auth };
}

type Fresh = Awaited<ReturnType<typeof freshAuth>>;

describe("auth configuration from the environment", () => {
  const base = {
    APP_ENV: "development",
    INDEXING: "off",
    PLATFORM: "node",
    BETTER_AUTH_SECRET: TEST_SECRET,
  } as const;

  it("trusts the origins of BETTER_AUTH_URL and SITE_URL only", () => {
    const config = authConfigFromEnv(
      {
        ...base,
        BETTER_AUTH_URL: "https://auth.stone.example/some/path",
        SITE_URL: "https://stone.example/",
      },
      ["x-forwarded-for"],
    );
    expect(config.baseURL).toBe("https://auth.stone.example/some/path");
    expect(config.trustedOrigins).toEqual([
      "https://auth.stone.example",
      "https://stone.example",
    ]);
  });

  it("uses Secure cookies everywhere except plain-http localhost", () => {
    const secure = (env: Record<string, string>) =>
      authConfigFromEnv({ ...base, ...env } as never, []).secureCookies;
    expect(secure({ BETTER_AUTH_URL: "https://stone.example" })).toBe(true);
    expect(secure({ BETTER_AUTH_URL: "http://stone.example" })).toBe(true);
    expect(secure({ BETTER_AUTH_URL: "http://localhost:3000" })).toBe(false);
    expect(secure({ BETTER_AUTH_URL: "http://127.0.0.1:3000" })).toBe(false);
    expect(secure({ SITE_URL: "https://stone.example" })).toBe(true);
    // No URL configured: only local development may go without Secure.
    expect(secure({})).toBe(false);
    expect(secure({ APP_ENV: "preview" })).toBe(true);
    expect(secure({ APP_ENV: "production" })).toBe(true);
  });

  it("requires the secret", () => {
    expect(() =>
      authConfigFromEnv({ ...base, BETTER_AUTH_SECRET: undefined }, []),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe("security baseline (real Better Auth on PGlite)", () => {
  let f: Fresh;
  const email = "member@example.test";

  beforeAll(async () => {
    f = await freshAuth();
    expect((await signUp(f.auth, email)).status).toBe(200);
  });

  it("session cookie is httpOnly, SameSite=Lax, path / and named as the middleware expects", async () => {
    const response = await signIn(f.auth, email);
    expect(response.status).toBe(200);
    const line = setCookieLine(response, /session_token=/);
    expect(line).toMatch(/HttpOnly/i);
    expect(line).toMatch(/SameSite=Lax/i);
    expect(line).toMatch(/Path=\//i);
    expect(line).not.toMatch(/;\s*Secure/i);
    const name = line.split("=")[0];
    expect(SESSION_COOKIE_NAMES).toContain(name);
  });

  it("does not cache the session in a cookie", async () => {
    const response = await signIn(f.auth, email);
    expect(
      response.headers.getSetCookie().some((l) => /session_data/.test(l)),
    ).toBe(false);
  });

  it("sign-in errors do not reveal whether the email exists", async () => {
    const unknown = await signIn(f.auth, "nobody@example.test", "whatever-123");
    const wrong = await signIn(f.auth, email, "wrong-password-123");
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(unknown.status);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("passwords shorter than 8 characters are refused", async () => {
    const response = await f.auth.handler(
      authRequest("/sign-up/email", {
        body: { email: "short@example.test", password: "1234567", name: "S" },
      }),
    );
    expect(response.status).toBe(400);
    const rows = await f.db
      .select({ n: count() })
      .from(schema.user)
      .where(eq(schema.user.email, "short@example.test"));
    expect(rows[0]!.n).toBe(0);
  });

  it("stores only a password hash", async () => {
    const rows = await f.db
      .select({ password: schema.account.password })
      .from(schema.account)
      .innerJoin(schema.user, eq(schema.user.id, schema.account.userId))
      .where(eq(schema.user.email, email));
    expect(rows[0]!.password).toBeTruthy();
    expect(rows[0]!.password).not.toContain(TEST_PASSWORD);
  });

  it("rejects a cookie-bearing request from an untrusted origin", async () => {
    const cookie = sessionCookieFrom(await signIn(f.auth, email))!;
    const response = await f.auth.handler(
      authRequest("/sign-out", {
        body: {},
        cookie,
        origin: "https://evil.example",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("never logs the email of a duplicate sign-up", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    await signUp(f.auth, email);
    const printed = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    spies.forEach((s) => s.mockRestore());
    expect(printed).not.toContain(email);
  });
});

describe("rate limit is configured", () => {
  let f: Fresh;

  beforeAll(async () => {
    f = await freshAuth();
  });

  it("is enabled, stored in the database and strict on sign-in and sign-up", () => {
    const options = f.auth.options.rateLimit!;
    expect(options.enabled).toBe(true);
    expect(options.storage).toBe("database");
    expect(options.customRules).toMatchObject({
      "/sign-in/email": RATE_LIMIT_RULES.signIn,
      "/sign-up/email": RATE_LIMIT_RULES.signUp,
    });
    expect(RATE_LIMIT_RULES.signIn.max).toBeLessThanOrEqual(10);
    expect(RATE_LIMIT_RULES.signUp.max).toBeLessThanOrEqual(5);
  });

  it("blocks repeated sign-in attempts from one IP with 429, per IP, in the rate_limit table", async () => {
    const ip = nextTestIp();
    const statuses: number[] = [];
    for (let i = 0; i <= RATE_LIMIT_RULES.signIn.max; i += 1) {
      const response = await signIn(
        f.auth,
        "x@example.test",
        "wrong-pass-1",
        ip,
      );
      statuses.push(response.status);
    }
    expect(statuses.slice(0, -1).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    expect(
      (await signIn(f.auth, "x@example.test", "wrong-pass-1", nextTestIp()))
        .status,
    ).toBe(401);
    const rows = await f.db.select({ n: count() }).from(schema.rateLimit);
    expect(rows[0]!.n).toBeGreaterThan(0);
  });
});

describe("secure deployment cookies", () => {
  it("are Secure with the __Secure- prefix the middleware recognises", async () => {
    const { auth } = await freshAuth({
      baseURL: "https://stone.example",
      trustedOrigins: ["https://stone.example"],
      secureCookies: true,
    });
    const options = { baseURL: "https://stone.example" };
    await auth.handler(
      authRequest("/sign-up/email", {
        ...options,
        body: { email: "s@example.test", password: TEST_PASSWORD, name: "S" },
      }),
    );
    const response = await auth.handler(
      authRequest("/sign-in/email", {
        ...options,
        body: { email: "s@example.test", password: TEST_PASSWORD },
      }),
    );
    const line = setCookieLine(response, /session_token=/);
    expect(line).toMatch(/;\s*Secure/i);
    expect(line.startsWith("__Secure-")).toBe(true);
    expect(SESSION_COOKIE_NAMES).toContain(line.split("=")[0]);
  });
});

describe("seed users through Better Auth", () => {
  const options = {
    adminEmail: "seed-admin@example.test",
    adminPassword: "seed-admin-pass-1",
    clientEmail: "seed-client@example.test",
    clientPassword: "seed-client-pass-1",
  };

  it("creates the admin and client with hashed passwords, idempotently", async () => {
    const f = await freshAuth();
    const createUser = (user: Parameters<typeof createSeedUser>[1]) =>
      createSeedUser(f.auth, user);
    const first = await seed(f.db, { ...options, createUser });
    const second = await seed(f.db, { ...options, createUser });
    expect(first).toMatchObject({ users: 2, orders: 2, favorites: 3 });
    expect(second).toEqual(first);

    const roles = await f.db
      .select({ email: schema.user.email, role: schema.user.role })
      .from(schema.user)
      .orderBy(schema.user.email);
    expect(roles).toEqual([
      { email: options.adminEmail, role: "admin" },
      { email: options.clientEmail, role: "client" },
    ]);
    expect(
      (await signIn(f.auth, options.adminEmail, options.adminPassword)).status,
    ).toBe(200);
    expect(
      (await signIn(f.auth, options.clientEmail, options.clientPassword))
        .status,
    ).toBe(200);
    // The seed opens no sessions of its own.
    const sessions = await f.db.select({ n: count() }).from(schema.session);
    expect(sessions[0]!.n).toBe(2);
  });
});

describe("auth route handler", () => {
  function reset() {
    vi.resetModules();
    const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
    delete g.__stoneDb;
    delete g.__stoneAuth;
  }
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  it("answers 503 JSON without a database", async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const { GET, POST } = await import("@/app/api/auth/[...all]/route");
    for (const handler of [GET, POST]) {
      const response = await handler(authRequest("/get-session"));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        ok: false,
        reason: "auth-unavailable",
      });
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("serves Better Auth with a database", async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    const { GET, POST } = await import("@/app/api/auth/[...all]/route");
    const signUpResponse = await POST(
      authRequest("/sign-up/email", {
        body: {
          email: "route@example.test",
          password: TEST_PASSWORD,
          name: "R",
        },
      }),
    );
    expect(signUpResponse.status).toBe(200);
    const cookie = sessionCookieFrom(signUpResponse)!;
    const session = await GET(authRequest("/get-session", { cookie }));
    expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({
      user: { email: "route@example.test", role: "client" },
    });
  });
});

describe("server-action calls go through the handler (rate limit + origin check)", () => {
  function reset() {
    vi.resetModules();
    const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
    delete g.__stoneDb;
    delete g.__stoneAuth;
  }
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  it("signs in, forwards the session cookie to Next and is rate-limited", async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    const { callAuthEndpoint } = await import("@/server/auth/next");
    const ip = nextTestIp();
    request.headers = new Headers({
      origin: TEST_BASE_URL,
      host: "localhost:3000",
      "x-forwarded-for": ip,
    });

    const created = await callAuthEndpoint("/sign-up/email", {
      email: "action@example.test",
      password: TEST_PASSWORD,
      name: "A",
    });
    expect(created.ok).toBe(true);

    request.setCookies = [];
    const result = await callAuthEndpoint("/sign-in/email", {
      email: "action@example.test",
      password: TEST_PASSWORD,
    });
    expect(result.ok).toBe(true);
    const set = request.setCookies.find((c) => /session_token$/.test(c.name));
    expect(set?.options).toMatchObject({ httpOnly: true, sameSite: "lax" });

    const wrong = await callAuthEndpoint("/sign-in/email", {
      email: "action@example.test",
      password: "wrong-password-1",
    });
    expect(wrong).toEqual({
      ok: false,
      status: 401,
      code: "INVALID_EMAIL_OR_PASSWORD",
    });

    let last: Awaited<ReturnType<typeof callAuthEndpoint>> = wrong;
    for (let i = 0; i < RATE_LIMIT_RULES.signIn.max; i += 1) {
      last = await callAuthEndpoint("/sign-in/email", {
        email: "action@example.test",
        password: "wrong-password-1",
      });
    }
    expect(last).toMatchObject({ ok: false, status: 429 });
  });

  it("refuses a call whose origin is not trusted", async () => {
    const { callAuthEndpoint } = await import("@/server/auth/next");
    request.headers = new Headers({
      origin: "https://evil.example",
      host: "localhost:3000",
      cookie: "stone.session_token=x",
      "x-forwarded-for": nextTestIp(),
    });
    const result = await callAuthEndpoint("/sign-out", {});
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});
