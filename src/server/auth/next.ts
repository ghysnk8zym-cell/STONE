import "server-only";

import {
  parseSetCookieHeader,
  toCookieOptions,
} from "better-auth/cookies/utils";
import { cookies, headers } from "next/headers";

import { platform } from "../platform";
import { getAuth } from "./auth";
import { CLIENT_IP_HEADER } from "./constants";
import { logAuthFailure } from "./diagnostics";

let warnedNoClientIp = false;

/**
 * Headers for Better Auth with the rate-limit IP set by the platform rule (src/server/platform),
 * overwriting anything the client sent in CLIENT_IP_HEADER.
 */
function withClientIp(source: Headers): Headers {
  const result = new Headers(source);
  result.delete(CLIENT_IP_HEADER);
  const ip = platform.clientIp(source);
  if (ip) {
    result.set(CLIENT_IP_HEADER, ip);
  } else if (!warnedNoClientIp) {
    // Better Auth then counts every such request in one shared bucket per path.
    warnedNoClientIp = true;
    console.warn(
      "[auth] no client IP header on this host: rate limiting falls back to one shared bucket (docs/SECURITY.md)",
    );
  }
  return result;
}

/*
 * There is no public /api/auth/* route (docs/SECURITY.md): the browser never calls Better Auth. Sign-in, sign-up,
 * sign-out and the profile are server actions that call `callAuthEndpoint` below, i.e. the Better Auth handler
 * in-process, so the rate limit and the origin check still apply and no Better Auth endpoint is reachable over HTTP.
 */

/** The only endpoints the server actions call: sign-in, sign-up, sign-out and the password change. */
export type AuthEndpoint =
  "/sign-in/email" | "/sign-up/email" | "/sign-out" | "/change-password";

/**
 * Server-side only. On sign-in and sign-up `data` holds the raw session `token` (the cookie value
 * without its signature): never return it from a server action or render it. Use
 * `toClientResult()` for anything that reaches the browser.
 */
export type AuthEndpointResult =
  { ok: true; data: unknown } | { ok: false; status: number; code?: string };

/** What a server action may return to the browser: no token, no user data. */
export type ClientAuthResult =
  { ok: true } | { ok: false; status: number; code?: string };

export function toClientResult(result: AuthEndpointResult): ClientAuthResult {
  if (result.ok) return { ok: true };
  return {
    ok: false,
    status: result.status,
    ...(result.code ? { code: result.code } : {}),
  };
}

// Forwarded from the browser request: session cookie, the origin for Better Auth's CSRF check,
// the client IP headers for the platform rule, and the user agent stored with the session.
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

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Base URL of the internal request to Better Auth. The configured one when set; otherwise the
 * request host over https, except plain http for localhost. `x-forwarded-proto` is ignored: the
 * browser's Origin on a deployed host is https, and an http URL would fail the origin check.
 */
export function authRequestBase(
  configured: unknown,
  incoming: Headers,
): string {
  if (typeof configured === "string" && configured) return configured;
  const host = incoming.get("host") || "localhost";
  const hostname = new URL(`http://${host}`).hostname;
  return `${LOCAL_HOSTNAMES.has(hostname) ? "http" : "https"}://${host}`;
}

/**
 * Calls a Better Auth endpoint from a server action through `auth.handler`, not `auth.api`:
 * only the handler applies rate limiting and the origin check. Set-Cookie headers from the
 * response are written to the Next cookie store. Never throws for an auth failure.
 */
export async function callAuthEndpoint(
  path: AuthEndpoint,
  body: Record<string, unknown>,
): Promise<AuthEndpointResult> {
  let auth;
  try {
    auth = await getAuth();
  } catch (error) {
    logAuthFailure("auth_unavailable", error);
    auth = null;
  }
  if (!auth) return { ok: false, status: 503, code: "AUTH_UNAVAILABLE" };

  const incoming = await headers();
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  const url = new URL(
    `/api/auth${path}`,
    authRequestBase(auth.options.baseURL, incoming),
  );

  let response: Response;
  try {
    response = await auth.handler(
      new Request(url, {
        method: "POST",
        headers: withClientIp(forwarded),
        body: JSON.stringify(body),
      }),
    );
  } catch (error) {
    logAuthFailure("handler_failed", error);
    return { ok: false, status: 503, code: "AUTH_UNAVAILABLE" };
  }

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
