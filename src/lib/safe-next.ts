import { routing } from "@/i18n/routing";

/*
 * `next` (the page to return to after signing in) comes from the query string, so it is attacker
 * controlled. Only an internal path of the given locale is accepted; anything else falls back to
 * the account page. Used by the middleware (to build `next`) and by the guards and sign-in (to
 * read it). Pure: no server-only imports, it also runs in the middleware.
 */

const MAX_LENGTH = 1024;
// Any C0 control character, DEL or whitespace: URL parsers drop tabs and newlines, which turns
// `/\t/evil.com` into `//evil.com`, and CR/LF would split a Location header.
const UNSAFE_CHARS = /[\u0000- \u007f\\]/;
// Never send someone back to an auth form (or the sign-out question) after signing in.
const AUTH_PAGES = new Set(["sign-in", "sign-up", "sign-out"]);
const PROBE_ORIGIN = "http://stone.invalid";

function resolveLocale(locale: string): string {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

function isSafeSegment(segment: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }
  // `%2F`, `%5C` and encoded control characters could be decoded into a separator later on.
  return !UNSAFE_CHARS.test(decoded) && !decoded.includes("/");
}

export function accountPath(locale: string): string {
  return `/${resolveLocale(locale)}/account`;
}

export function sanitizeNext(value: unknown, locale: string): string {
  const fallback = accountPath(locale);
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (value.length > MAX_LENGTH || UNSAFE_CHARS.test(value)) return fallback;
  // Only a root-relative path: rejects `//host`, `https:…`, `javascript:…` and relative paths.
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;

  // After URL normalisation (`..`, `%2e%2e`), so dot segments cannot climb out of the locale.
  const segments = url.pathname.split("/").slice(1);
  const prefix = `/${resolveLocale(locale)}`;
  if (`/${segments[0]}` !== prefix) return fallback;
  const rest = segments.slice(1);
  if (rest.some((segment, i) => segment === "" && i < rest.length - 1)) {
    return fallback; // an empty segment means `//` inside the path
  }
  if (!rest.every((segment) => segment === "" || isSafeSegment(segment))) {
    return fallback;
  }
  // Segments are known to decode safely here; compare decoded and case-insensitively.
  if (AUTH_PAGES.has(decodeURIComponent(rest[0] ?? "").toLowerCase())) {
    return fallback;
  }

  const path = rest.length === 0 ? `${prefix}/` : url.pathname;
  const result = `${path}${url.search}`;
  return result.startsWith(`${prefix}/`) ? result : fallback;
}
