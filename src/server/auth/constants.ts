/*
 * Names shared by the Better Auth config (auth.ts) and the middleware. No server-only import:
 * the middleware bundle must not pull in Better Auth or the database.
 */

/** Better Auth `advanced.cookiePrefix`. */
export const AUTH_COOKIE_PREFIX = "stone";

/**
 * The session token cookie, as Better Auth names it without and with Secure cookies
 * (`__Secure-` prefix on HTTPS deployments). tests/unit/auth-security.test.ts checks both
 * against the cookies Better Auth really sets.
 */
export const SESSION_COOKIE_NAMES = [
  `${AUTH_COOKIE_PREFIX}.session_token`,
  `__Secure-${AUTH_COOKIE_PREFIX}.session_token`,
] as const;

/**
 * Request header set by the middleware to the (sanitised) path and query of the page, so a guard
 * can send a Guest to sign-in with `next`. The middleware always overwrites a client value.
 */
export const REQUEST_PATH_HEADER = "x-stone-path";

type CookieReader = { get(name: string): { value: string } | undefined };

/** Optimistic only: a present cookie is not proof of a session (the guards check the database). */
export function hasSessionCookie(cookies: CookieReader): boolean {
  return SESSION_COOKIE_NAMES.some((name) => !!cookies.get(name)?.value);
}
