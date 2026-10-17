// Shared helpers for the Better Auth tests (PGlite + the real Better Auth handler). Every secret
// and password here is an obviously fake test value.

export const TEST_BASE_URL = "http://localhost:3000";
export const TEST_SECRET = "test-only-secret-not-real-0123456789abcdef";
export const TEST_PASSWORD = "test-password-not-real-1";

let ipCounter = 0;
/** A fresh client IP per call, so rate-limit buckets of different tests never collide. */
export function nextTestIp(): string {
  ipCounter += 1;
  return `10.${Math.floor(ipCounter / 250) % 250}.${ipCounter % 250}.7`;
}

export type AuthHandler = { handler: (request: Request) => Promise<Response> };

export function authRequest(
  path: string,
  init: {
    method?: "GET" | "POST";
    body?: unknown;
    cookie?: string;
    ip?: string;
    origin?: string;
    baseURL?: string;
  } = {},
): Request {
  const ip = init.ip ?? nextTestIp();
  const headers = new Headers({
    "content-type": "application/json",
    origin: init.origin ?? init.baseURL ?? TEST_BASE_URL,
    "x-forwarded-for": ip,
    // What the auth route sets from the platform rule; lets tests call `auth.handler` of the
    // getAuth() instance directly. The route itself always overwrites it.
    "x-stone-client-ip": ip.split(",").at(-1)!.trim(),
  });
  if (init.cookie) headers.set("cookie", init.cookie);
  const method = init.method ?? (init.body === undefined ? "GET" : "POST");
  return new Request(`${init.baseURL ?? TEST_BASE_URL}/api/auth${path}`, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(init.body ?? {}) : undefined,
  });
}

/** `name=value` of the session token cookie set by a response, or null. */
export function sessionCookieFrom(response: Response): string | null {
  for (const line of response.headers.getSetCookie()) {
    const [pair] = line.split(";");
    if (pair && /session_token=./.test(pair)) return pair.trim();
  }
  return null;
}

export function setCookieLine(response: Response, name: RegExp): string {
  const line = response.headers.getSetCookie().find((l) => name.test(l));
  if (!line) throw new Error("expected a Set-Cookie header");
  return line;
}

export async function signUp(
  auth: AuthHandler,
  email: string,
  extra: Record<string, unknown> = {},
) {
  return auth.handler(
    authRequest("/sign-up/email", {
      body: { email, password: TEST_PASSWORD, name: "Test User", ...extra },
    }),
  );
}

export async function signIn(
  auth: AuthHandler,
  email: string,
  password = TEST_PASSWORD,
  ip?: string,
) {
  return auth.handler(
    authRequest("/sign-in/email", { body: { email, password }, ip }),
  );
}

/** Calls `fn` and returns what it threw (Next's redirect/notFound throw by design). */
export async function thrown(fn: () => Promise<unknown>): Promise<{
  digest?: string;
}> {
  try {
    await fn();
  } catch (error) {
    return error as { digest?: string };
  }
  throw new Error("expected the call to throw");
}

/** The target of a Next `redirect()` error, or null for any other error. */
export function redirectTarget(error: { digest?: string }): string | null {
  const parts = error.digest?.split(";") ?? [];
  return parts[0] === "NEXT_REDIRECT" ? parts.slice(2, -2).join(";") : null;
}

export function isNotFound(error: { digest?: string }): boolean {
  return error.digest === "NEXT_HTTP_ERROR_FALLBACK;404";
}
