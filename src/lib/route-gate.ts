/*
 * Route gate, applied by src/middleware.ts before next-intl. It decides, from the path alone,
 * whether a request under /{locale} may reach the App Router:
 * - A product slug of the right shape reaches `catalog/[slug]` (rendered per request since Phase 4a
 *   Task 5, see docs/ARCHITECTURE.md). Whether the product exists is the route's decision (it
 *   reads the catalog, which since Phase 4a lives in the database); the middleware cannot await a
 *   database on every host, so it no longer knows the slug list.
 * - What the gate still guarantees is the part that poisoned the route cache in Phase 3: only
 *   lowercase slugs ever reach the route. A slug in another case or encoding (`Black-Marble`) is
 *   redirected (308) to its lowercase form, so on a case-insensitive file system it can never
 *   overwrite the prerendered `black-marble` entry. A segment that is not a slug at all (dots, spaces,
 *   garbage) is a 404 here and never reaches the route.
 * - Every other unknown path is rewritten to the `/{locale}/404` page with status 404. That page
 *   renders the localised 404 normally.
 */

/** Segment of the internal 404 page: src/app/[locale]/(site)/404/page.tsx. */
export const NOT_FOUND_SEGMENT = "404";

/** The shape of a product slug (also enforced by the admin form's zod schema). */
export const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Static public paths under /{locale}. Add new pages here (tests/unit/route-gate.test.ts checks it). */
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  "",
  "catalog",
  "create-your-stone",
  "_styleguide",
  "sign-in",
  "sign-up",
  "sign-out",
  // Phase 4a: the pages themselves call requireUser / requireRole (the middleware only does the
  // optimistic redirect).
  "account",
  "account/orders",
  "account/favorites",
  "account/profile",
  // Test shop: the cart is public (a Guest builds a cart); the checkout page sends a Guest to sign-in.
  "cart",
  "checkout",
  "admin",
  "admin/orders",
  "admin/products",
  "admin/products/new",
  "admin/create-your-stone",
  "admin/customers",
  "admin/promotions",
  "admin/site-content",
]);

/** An order number (`D-1048`, `T-2001`), as the admin status action also validates it. */
export const ORDER_NUMBER_SHAPE = /^[A-Z]-\d{3,9}$/;

export type RouteGate =
  | { action: "next" }
  | { action: "redirect"; pathname: string }
  | { action: "not-found"; locale: string };

export interface RouteGateOptions {
  locales: readonly string[];
}

function decode(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

/** Pages whose last segment is a product slug: `catalog/<slug>` and `admin/products/<slug>`. */
function slugRoute(path: string[]): { prefix: string; slug: string } | null {
  if (path.length === 2 && path[0] === "catalog") {
    return { prefix: "catalog", slug: path[1]! };
  }
  if (path.length === 3 && path[0] === "admin" && path[1] === "products") {
    return { prefix: "admin/products", slug: path[2]! };
  }
  return null;
}

export function gateRoute(
  pathname: string,
  { locales }: RouteGateOptions,
): RouteGate {
  const [locale, ...path] = pathname.split("/").filter(Boolean);
  // No locale prefix: next-intl redirects to /{default}/..., which passes the gate again.
  if (locale === undefined || !locales.includes(locale)) {
    return { action: "next" };
  }

  if (PUBLIC_ROUTES.has(path.join("/"))) return { action: "next" };

  // One order of the signed-in user: the page itself checks ownership (404 otherwise).
  if (
    path.length === 3 &&
    path[0] === "account" &&
    path[1] === "orders" &&
    ORDER_NUMBER_SHAPE.test(path[2]!)
  ) {
    return { action: "next" };
  }

  const route = slugRoute(path);
  if (route) {
    const canonical = decode(route.slug)?.toLowerCase();
    if (canonical !== undefined && SLUG_SHAPE.test(canonical)) {
      if (canonical === route.slug) return { action: "next" };
      return {
        action: "redirect",
        pathname: `/${locale}/${route.prefix}/${canonical}`,
      };
    }
  }

  return { action: "not-found", locale };
}
