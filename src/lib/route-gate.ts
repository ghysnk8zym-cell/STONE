/*
 * Route gate, applied by src/middleware.ts before next-intl. It decides, from the path alone,
 * whether a request under /{locale} may reach the App Router:
 * - Known product slugs only reach `catalog/[slug]`. That route is SSG with on-demand ISR
 *   (`dynamicParams` stays true, see docs/ARCHITECTURE.md), so any other slug would be rendered
 *   and written to the route cache. On a case-insensitive file system `Black-Marble` would
 *   overwrite the prerendered `black-marble` entry with a 404.
 * - A known slug in another case or encoding is redirected (308) to its canonical form.
 * - Every other unknown path is rewritten to the `/{locale}/404` page with status 404. That page
 *   renders the localised 404 normally; `notFound()` would only send the empty
 *   `__next_error__` shell, with the content left to client-side rendering.
 */

/** Segment of the internal 404 page: src/app/[locale]/(site)/404/page.tsx. */
export const NOT_FOUND_SEGMENT = "404";

/** Static public paths under /{locale}. Add new pages here (tests/unit/route-gate.test.ts checks it). */
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  "",
  "catalog",
  "_styleguide",
]);

export type RouteGate =
  | { action: "next" }
  | { action: "redirect"; pathname: string }
  | { action: "not-found"; locale: string };

export interface RouteGateOptions {
  locales: readonly string[];
  slugs: readonly string[];
}

function decode(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

export function gateRoute(
  pathname: string,
  { locales, slugs }: RouteGateOptions,
): RouteGate {
  const [locale, ...path] = pathname.split("/").filter(Boolean);
  // No locale prefix: next-intl redirects to /{default}/..., which passes the gate again.
  if (locale === undefined || !locales.includes(locale)) {
    return { action: "next" };
  }

  if (PUBLIC_ROUTES.has(path.join("/"))) return { action: "next" };

  if (path.length === 2 && path[0] === "catalog") {
    const slug = path[1]!;
    if (slugs.includes(slug)) return { action: "next" };
    const canonical = decode(slug)?.toLowerCase();
    if (canonical !== undefined && slugs.includes(canonical)) {
      return {
        action: "redirect",
        pathname: `/${locale}/catalog/${canonical}`,
      };
    }
  }

  return { action: "not-found", locale };
}
