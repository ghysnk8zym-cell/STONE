import "server-only";

import {
  parseSetCookieHeader,
  toCookieOptions,
} from "better-auth/cookies/utils";
import { cookies, headers } from "next/headers";

import { getAuth } from "./auth";

const noStore = { "Cache-Control": "no-store" };

/** Error name and code only: messages can contain the connection URL. */
function safeErrorSummary(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? `${name} ${code}` : name;
}

/** The catch-all /api/auth/* route: Better Auth, or 503 JSON without a database. */
export async function handleAuthRequest(request: Request): Promise<Response> {
  let auth;
  try {
    auth = await getAuth();
  } catch (error) {
    console.error(`[auth] unavailable: ${safeErrorSummary(error)}`);
    auth = null;
  }
  if (!auth) {
    return Response.json(
      { ok: false, reason: "auth-unavailable" },
      { status: 503, headers: noStore },
    );
  }
  return auth.handler(request);
}

/** Endpoints that server actions may call (Task 3 sign-in/up/out, Task 4 profile). */
export type AuthEndpoint =
  | "/sign-in/email"
  | "/sign-up/email"
  | "/sign-out"
  | "/change-password"
  | "/update-user";

export type AuthEndpointResult =
  { ok: true; data: unknown } | { ok: false; status: number; code?: string };

// Forwarded from the browser request: session cookie, the origin for Better Auth's CSRF check,
// the client IP for rate limiting, and the user agent stored with the session.
const FORWARDED_HEADERS = [
  "cookie",
  "origin",
  "referer",
  "user-agent",
  "x-forwarded-for",
  "cf-connecting-ip",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
];

/**
 * Calls a Better Auth endpoint from a server action through `auth.handler`, not `auth.api`:
 * only the handler applies rate limiting and the origin check. Set-Cookie headers from the
 * response are written to the Next cookie store. Never throws for an auth failure.
 */
export async function callAuthEndpoint(
  path: AuthEndpoint,
  body: Record<string, unknown>,
): Promise<AuthEndpointResult> {
  const auth = await getAuth();
  if (!auth) return { ok: false, status: 503, code: "AUTH_UNAVAILABLE" };

  const incoming = await headers();
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  // The URL only routes the request inside Better Auth; with a configured base URL it must match.
  const base =
    auth.options.baseURL ??
    `${incoming.get("x-forwarded-proto") ?? "http"}://${incoming.get("host") ?? "localhost"}`;
  const url = new URL(`/api/auth${path}`, base);

  const response = await auth.handler(
    new Request(url, {
      method: "POST",
      headers: forwarded,
      body: JSON.stringify(body),
    }),
  );

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    const store = await cookies();
    parseSetCookieHeader(setCookie).forEach((attributes, name) => {
      if (name) store.set(name, attributes.value, toCookieOptions(attributes));
    });
  }

  const data: unknown = await response.json().catch(() => null);
  if (response.ok) return { ok: true, data };
  const code = (data as { code?: unknown } | null)?.code;
  return {
    ok: false,
    status: response.status,
    ...(typeof code === "string" ? { code } : {}),
  };
}
