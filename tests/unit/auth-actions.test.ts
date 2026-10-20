import { count } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthFormState } from "@/features/auth/form-state";

import {
  nextTestIp,
  redirectTarget,
  TEST_BASE_URL,
  TEST_PASSWORD,
  TEST_SECRET,
  thrown,
} from "./auth-helpers";

vi.mock("server-only", () => ({}));

// The actions read the incoming request through next/headers; the tests play the browser.
const request = vi.hoisted(() => ({
  headers: new Headers(),
  setCookies: [] as { name: string; value: string; options: unknown }[],
  // What Better Auth really returned to callAuthEndpoint (token included), to check it never leaks.
  endpointResults: [] as unknown[],
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
vi.mock("@/server/auth/next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth/next")>();
  return {
    ...actual,
    callAuthEndpoint: async (
      ...args: Parameters<typeof actual.callAuthEndpoint>
    ) => {
      const result = await actual.callAuthEndpoint(...args);
      request.endpointResults.push(result);
      return result;
    },
  };
});

function asBrowser(init: { cookie?: string } = {}) {
  request.headers = new Headers({
    origin: TEST_BASE_URL,
    host: new URL(TEST_BASE_URL).host,
    // A distinct client per test: the rate limit is per IP and path.
    "x-forwarded-for": nextTestIp(),
  });
  if (init.cookie) request.headers.set("cookie", init.cookie);
  request.setCookies = [];
  request.endpointResults = [];
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  data.set("locale", "ru");
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function resetSingletons() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

const empty: AuthFormState = { error: null, email: "" };

describe("auth server actions with a database (PGlite + real Better Auth)", () => {
  let actions: typeof import("@/app/[locale]/(auth)/actions");
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let schema: typeof import("@/server/db/schema");
  const clientEmail = "member@example.test";

  beforeAll(async () => {
    resetSingletons();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/app/[locale]/(auth)/actions");
    schema = await import("@/server/db/schema");
    const database = await (await import("@/server/db")).getDb();
    if (!database) throw new Error("expected a database");
    db = database;
    // One account to sign in to.
    asBrowser();
    const target = redirectTarget(
      await thrown(() =>
        actions.signUpAction(
          empty,
          form({ email: clientEmail, password: TEST_PASSWORD }),
        ),
      ),
    );
    expect(target).toBe("/ru/account");
  });

  beforeEach(() => asBrowser());

  it("sign-up signs the new user in and redirects to the account page", async () => {
    const email = "fresh@example.test";
    const error = await thrown(() =>
      actions.signUpAction(empty, form({ email, password: TEST_PASSWORD })),
    );
    expect(redirectTarget(error)).toBe("/ru/account");
    expect(request.setCookies.some((c) => /session_token$/.test(c.name))).toBe(
      true,
    );
    const [{ value }] = await db.select({ value: count() }).from(schema.user);
    expect(value).toBeGreaterThanOrEqual(2);
  });

  it("sign-up keeps the locale and an internal next, and ignores an external next", async () => {
    const internal = await thrown(() =>
      actions.signUpAction(
        empty,
        form({
          email: "next-a@example.test",
          password: TEST_PASSWORD,
          next: "/en/catalog/black-marble",
          locale: "en",
        }),
      ),
    );
    expect(redirectTarget(internal)).toBe("/en/catalog/black-marble");

    for (const evil of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
      asBrowser();
      const error = await thrown(() =>
        actions.signUpAction(
          empty,
          form({
            email: `evil-${nextTestIp()}@example.test`,
            password: TEST_PASSWORD,
            next: evil,
          }),
        ),
      );
      expect(redirectTarget(error), evil).toBe("/ru/account");
    }
  });

  it("sign-up with a taken email returns emailTaken and keeps the email", async () => {
    const state = await actions.signUpAction(
      empty,
      form({ email: clientEmail, password: TEST_PASSWORD }),
    );
    expect(state).toEqual({ error: "emailTaken", email: clientEmail });
  });

  it("sign-up with a weak password is refused before Better Auth is called", async () => {
    const state = await actions.signUpAction(
      empty,
      form({ email: "weak@example.test", password: "1234567" }),
    );
    expect(state).toEqual({
      error: "weakPassword",
      email: "weak@example.test",
    });
    expect(request.endpointResults).toEqual([]);
  });

  it("sign-in with the right password redirects to next, never off-site", async () => {
    const ok = await thrown(() =>
      actions.signInAction(
        empty,
        form({
          email: clientEmail,
          password: TEST_PASSWORD,
          next: "/ru/catalog",
        }),
      ),
    );
    expect(redirectTarget(ok)).toBe("/ru/catalog");
    expect(request.setCookies.some((c) => /session_token$/.test(c.name))).toBe(
      true,
    );

    asBrowser();
    const external = await thrown(() =>
      actions.signInAction(
        empty,
        form({
          email: clientEmail,
          password: TEST_PASSWORD,
          next: "//evil.com",
        }),
      ),
    );
    expect(redirectTarget(external)).toBe("/ru/account");
  });

  it("sign-in errors do not reveal whether the account exists", async () => {
    const wrongPassword = await actions.signInAction(
      empty,
      form({ email: clientEmail, password: "definitely-wrong-1" }),
    );
    const unknownEmail = await actions.signInAction(
      empty,
      form({ email: "nobody@example.test", password: "definitely-wrong-1" }),
    );
    expect(wrongPassword.error).toBe("invalidCredentials");
    // Same code, same shape (only the typed email differs, which the user typed themselves).
    expect(unknownEmail.error).toBe(wrongPassword.error);
    expect(Object.keys(unknownEmail)).toEqual(Object.keys(wrongPassword));
    expect(request.setCookies).toEqual([]);
  });

  it("no action result contains the session token or anything from Better Auth", async () => {
    const results: AuthFormState[] = [];
    results.push(
      await actions.signUpAction(
        empty,
        form({ email: clientEmail, password: TEST_PASSWORD }),
      ),
    );
    results.push(
      await actions.signInAction(
        empty,
        form({ email: clientEmail, password: "wrong-password-1" }),
      ),
    );
    // The success paths end in a redirect (they return nothing), but Better Auth did hand the
    // action a token there: it must not appear in the cookie-less return of any path.
    asBrowser();
    await thrown(() =>
      actions.signInAction(
        empty,
        form({ email: clientEmail, password: TEST_PASSWORD }),
      ),
    );
    const signedIn = request.endpointResults.find(
      (r): r is { ok: true; data: { token: string } } =>
        (r as { ok: boolean }).ok === true,
    );
    expect(typeof signedIn?.data.token).toBe("string");
    const token = signedIn!.data.token;

    for (const state of results) {
      expect(Object.keys(state).sort()).toEqual(["email", "error"]);
      const text = JSON.stringify(state);
      expect(text).not.toContain(token);
      expect(text.toLowerCase()).not.toContain("token");
    }
  });

  it("sign-out ends the session in the database, clears the cookie and goes home", async () => {
    asBrowser();
    await thrown(() =>
      actions.signInAction(
        empty,
        form({ email: clientEmail, password: TEST_PASSWORD }),
      ),
    );
    const cookie = request.setCookies.find((c) =>
      /session_token$/.test(c.name),
    )!;
    const before = (
      await db.select({ value: count() }).from(schema.session)
    )[0]!.value;

    asBrowser({ cookie: `${cookie.name}=${cookie.value}` });
    const error = await thrown(() =>
      actions.signOutAction(form({ locale: "en" })),
    );
    expect(redirectTarget(error)).toBe("/en");

    const after = (await db.select({ value: count() }).from(schema.session))[0]!
      .value;
    expect(after).toBe(before - 1);
    const cleared = request.setCookies.find((c) =>
      /session_token$/.test(c.name),
    );
    expect(cleared?.value).toBe("");
  });

  it("sign-out without a session just goes home", async () => {
    asBrowser();
    const error = await thrown(() => actions.signOutAction(form({})));
    expect(redirectTarget(error)).toBe("/ru");
  });

  it("repeated sign-in failures from one client are rate limited", async () => {
    asBrowser();
    const codes: (string | null)[] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      const state = await actions.signInAction(
        empty,
        form({ email: clientEmail, password: `wrong-password-${attempt}` }),
      );
      codes.push(state.error);
    }
    expect(codes.slice(0, 10).every((c) => c === "invalidCredentials")).toBe(
      true,
    );
    expect(codes.at(-1)).toBe("tooManyAttempts");
  });
});

describe("auth server actions without a database", () => {
  it("answer unavailable instead of failing", async () => {
    resetSingletons();
    // The recording wrapper above caches the first (database-backed) module graph.
    vi.doUnmock("@/server/auth/next");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    const actions = await import("@/app/[locale]/(auth)/actions");
    asBrowser();
    expect(
      await actions.signInAction(
        empty,
        form({ email: "a@example.test", password: "whatever-123" }),
      ),
    ).toEqual({ error: "unavailable", email: "a@example.test" });
    expect(
      await actions.signUpAction(
        empty,
        form({ email: "a@example.test", password: "whatever-123" }),
      ),
    ).toEqual({ error: "unavailable", email: "a@example.test" });
    // No database cannot confirm that a previously issued session was revoked.
    const error = await thrown(() => actions.signOutAction(form({})));
    expect(redirectTarget(error)).toBe("/ru/sign-out?error=unavailable");
  });
});
