import { format } from "node:util";

import { APIError, createAuthMiddleware } from "better-auth/api";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  authRequest,
  nextTestIp,
  redirectTarget,
  sessionCookieFrom,
  TEST_BASE_URL,
  TEST_PASSWORD,
  TEST_SECRET,
  thrown,
} from "./auth-helpers";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({
  headers: new Headers(),
  cleared: false,
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: (name: string, value: string) => {
      if (/session_token$/.test(name) && !value) request.cleared = true;
    },
  }),
}));

// Synthetic markers only. Assertions compare booleans so failures never print payloads.
const markers = [
  "fixture-session-value",
  "fixture-password-value",
  "fixture-db-url",
];
function driverError() {
  const error = new Error(`Failed query ${markers.join(" ")}`, {
    cause: Object.assign(new Error(markers[2]), { code: "ECONNREFUSED" }),
  });
  error.name = "DrizzleQueryError";
  return error;
}

describe("auth failure boundaries", () => {
  let auth: NonNullable<
    Awaited<ReturnType<typeof import("@/server/auth/auth").getAuth>>
  >;
  let actions: typeof import("@/app/[locale]/(auth)/actions");

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    const created = await (await import("@/server/auth/auth")).getAuth();
    if (!created) throw new Error("expected test auth");
    auth = created;
    actions = await import("@/app/[locale]/(auth)/actions");
    const response = await auth.handler(
      authRequest("/sign-up/email", {
        body: {
          email: "failures@example.test",
          password: TEST_PASSWORD,
          name: "Fixture",
        },
      }),
    );
    expect(response.status).toBe(200);
  });
  afterAll(() => vi.unstubAllEnvs());

  async function signedIn() {
    const response = await auth.handler(
      authRequest("/sign-in/email", {
        body: { email: "failures@example.test", password: TEST_PASSWORD },
      }),
    );
    expect(response.status).toBe(200);
    const cookie = sessionCookieFrom(response)!;
    request.headers = new Headers({
      origin: TEST_BASE_URL,
      host: "localhost:3000",
      cookie,
      "x-forwarded-for": nextTestIp(),
    });
    request.cleared = false;
    return cookie;
  }
  function data() {
    const form = new FormData();
    form.set("locale", "en");
    return form;
  }
  async function expectLive(cookie: string) {
    const response = await auth.handler(
      authRequest("/get-session", { cookie }),
    );
    expect((await response.json()) !== null).toBe(true);
  }

  it("does not print nested driver payloads when session lookup fails", async () => {
    const cookie = await signedIn();
    const context = await auth.$context;
    const lookup = vi
      .spyOn(context.internalAdapter, "findSession")
      .mockRejectedValue(driverError());
    const logs = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    try {
      const response = await auth.handler(
        authRequest("/get-session", { cookie }),
      );
      expect(response.status).toBe(500);
      const printed = logs
        .flatMap((log) => log.mock.calls)
        .map((args) => format(...args))
        .join("\n");
      expect(markers.some((marker) => printed.includes(marker))).toBe(false);
      expect(printed.includes("session_read_failed")).toBe(true);
      expect(printed.includes("ECONNREFUSED")).toBe(true);
    } finally {
      lookup.mockRestore();
      logs.forEach((log) => log.mockRestore());
    }
  });

  it("does not leak through the router's global APIError logger", async () => {
    const previous = auth.options.hooks!.before;
    auth.options.hooks!.before = createAuthMiddleware(async () => {
      throw new APIError("INTERNAL_SERVER_ERROR", {
        message: markers.join(" "),
      });
    });
    const logs = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    try {
      const response = await auth.handler(
        authRequest("/sign-out", { body: {} }),
      );
      expect(response.status).toBe(500);
      const printed = logs
        .flatMap((log) => log.mock.calls)
        .map((args) => format(...args))
        .join("\n");
      expect(markers.some((marker) => printed.includes(marker))).toBe(false);
      expect(printed.includes("api_failed")).toBe(true);
    } finally {
      auth.options.hooks!.before = previous;
      logs.forEach((log) => log.mockRestore());
    }
  });

  it("does not leak through Better Call's non-APIError fallback logger", async () => {
    const previous = auth.options.hooks!.before;
    auth.options.hooks!.before = createAuthMiddleware(async () => {
      throw driverError();
    });
    const logs = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    try {
      const response = await auth.handler(
        authRequest("/sign-out", { body: {} }),
      );
      expect(response.status).toBe(500);
      const printed = logs
        .flatMap((log) => log.mock.calls)
        .map((args) => format(...args))
        .join("\n");
      expect(markers.some((marker) => printed.includes(marker))).toBe(false);
      expect(printed.includes("api_failed")).toBe(true);
    } finally {
      auth.options.hooks!.before = previous;
      logs.forEach((log) => log.mockRestore());
    }
  });

  it("keeps the session and shows a retryable error when origin validation refuses logout", async () => {
    const cookie = await signedIn();
    request.headers.set("origin", "https://untrusted.example");
    const error = await thrown(() => actions.signOutAction(data()));
    expect(redirectTarget(error)).toBe("/en/sign-out?error=generic");
    expect(request.cleared).toBe(false);
    await expectLive(cookie);
  });

  it("never revokes a session using an invalid cookie signature", async () => {
    const cookie = await signedIn();
    request.headers.set("cookie", `${cookie}invalid-signature`);
    const error = await thrown(() => actions.signOutAction(data()));
    expect(redirectTarget(error)).toBe("/en");
    await expectLive(cookie);
  });

  it("discards arbitrary error names and codes as well as messages", async () => {
    const { logAuthFailure } = await import("@/server/auth/diagnostics");
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logAuthFailure(
        "handler_failed",
        Object.assign(driverError(), {
          name: markers[0],
          code: markers[1],
          cause: undefined,
        }),
      );
      const printed = logs.mock.calls.map((args) => format(...args)).join("\n");
      expect(markers.some((marker) => printed.includes(marker))).toBe(false);
      expect(printed.includes("handler_failed")).toBe(true);
      expect(printed.includes("unknown")).toBe(true);
    } finally {
      logs.mockRestore();
    }
  });

  it("keeps the session and shows a rate-limit error when logout is throttled", async () => {
    const ip = nextTestIp();
    for (let attempt = 0; attempt < 100; attempt++) {
      const response = await auth.handler(
        authRequest("/sign-out", { body: {}, ip }),
      );
      expect(response.status).toBe(200);
    }
    const cookie = await signedIn();
    request.headers.set("x-forwarded-for", ip);
    const error = await thrown(() => actions.signOutAction(data()));
    expect(redirectTarget(error)).toBe("/en/sign-out?error=tooManyAttempts");
    expect(request.cleared).toBe(false);
    await expectLive(cookie);
  });

  it("does not claim success or clear the cookie if database revocation fails; retry revokes it", async () => {
    const cookie = await signedIn();
    const db = await (await import("@/server/db")).getDb();
    if (!db) throw new Error("expected test database");
    const deletion = vi.spyOn(db, "delete").mockImplementation(() => {
      throw driverError();
    });
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const error = await thrown(() => actions.signOutAction(data()));
      expect(redirectTarget(error)).toBe("/en/sign-out?error=unavailable");
      expect(request.cleared).toBe(false);
      await expectLive(cookie);
    } finally {
      deletion.mockRestore();
      logs.mockRestore();
    }
    const retry = await thrown(() => actions.signOutAction(data()));
    expect(redirectTarget(retry)).toBe("/en");
    expect(request.cleared).toBe(true);
    const response = await auth.handler(
      authRequest("/get-session", { cookie }),
    );
    expect(await response.json()).toBeNull();
  });

  it("revokes the session even when the library silently skips deletion after a preflight lookup failure", async () => {
    const cookie = await signedIn();
    const context = await auth.$context;
    // Better Auth's deleteWithHooks swallows this failure and skips its DELETE entirely.
    const findMany = context.adapter.findMany.bind(context.adapter);
    const lookup = vi
      .spyOn(context.adapter, "findMany")
      .mockImplementation((args) =>
        args.model === "session"
          ? Promise.reject(driverError())
          : findMany(args),
      );
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const error = await thrown(() => actions.signOutAction(data()));
      expect(redirectTarget(error)).toBe("/en");
    } finally {
      lookup.mockRestore();
      logs.mockRestore();
    }
    const response = await auth.handler(
      authRequest("/get-session", { cookie }),
    );
    expect((await response.json()) === null).toBe(true);
  });

  it("contains a thrown handler failure without clearing the cookie", async () => {
    await signedIn();
    const handler = vi.spyOn(auth, "handler").mockRejectedValue(driverError());
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const error = await thrown(() => actions.signOutAction(data()));
      expect(redirectTarget(error)).toBe("/en/sign-out?error=unavailable");
      expect(request.cleared).toBe(false);
    } finally {
      handler.mockRestore();
      logs.mockRestore();
    }
  });
});
