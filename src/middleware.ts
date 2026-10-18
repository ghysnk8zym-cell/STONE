import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { gateRoute, NOT_FOUND_SEGMENT } from "./lib/route-gate";
import { sanitizeNext } from "./lib/safe-next";
import { routing } from "./i18n/routing";
import { hasSessionCookie, REQUEST_PATH_HEADER } from "./server/auth/constants";

// middleware.ts (not proxy.ts): OpenNext on Cloudflare does not yet support the
// Node.js proxy runtime (ADR-001).
const intl = createMiddleware(routing);

// The gate only normalises the case and checks the shape of a product slug: whether a product
// exists is the route's decision (the catalog is in the database, which the middleware cannot await).
const gateOptions = { locales: routing.locales };

/** Areas that need a session: /{locale}/account and /{locale}/admin, and everything below them. */
const PROTECTED_AREAS = new Set(["account", "admin"]);

function protectedLocale(pathname: string): string | null {
  const [locale, area] = pathname.split("/").filter(Boolean);
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    return null;
  }
  return area && PROTECTED_AREAS.has(area) ? locale : null;
}

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locale = protectedLocale(pathname);

  // Optimistic check only (ADR-002): a Guest without a session cookie goes straight to sign-in.
  // A present cookie proves nothing; every protected page and action calls requireUser/requireRole.
  if (locale && !hasSessionCookie(request.cookies)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.search = `?next=${encodeURIComponent(sanitizeNext(pathname + search, locale))}`;
    return NextResponse.redirect(url);
  }

  // The guards read the page path from this header (for `next` after an expired session).
  // Always set here, so a client cannot supply its own value.
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, pathname + search);
  const forwarded = new NextRequest(request, { headers });

  const gate = gateRoute(request.nextUrl.pathname, gateOptions);

  if (gate.action === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = gate.pathname;
    return NextResponse.redirect(url, 308);
  }

  if (gate.action === "not-found") {
    // Rendered by [locale]/(site)/404/page.tsx; the browser keeps the requested URL.
    const url = request.nextUrl.clone();
    url.pathname = `/${gate.locale}/${NOT_FOUND_SEGMENT}`;
    url.search = "";
    return NextResponse.rewrite(url, { status: 404, request: { headers } });
  }

  return intl(forwarded);
}

export const config = {
  matcher: [
    // Skip API routes, Next internals and any path with a file extension.
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Product paths with a dot (`/ru/catalog/x.rsc`) too: they would skip the gate (case normalisation) otherwise.
    // Locales are listed literally (the matcher must be static): a `:locale` wildcard also matched
    // /images/catalog/*.webp and redirected every catalog image. Kept in sync by a unit test.
    "/(ru|en)/catalog/:path*",
  ],
};
