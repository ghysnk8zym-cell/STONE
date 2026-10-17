import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { gateRoute, NOT_FOUND_SEGMENT } from "./lib/route-gate";
import { routing } from "./i18n/routing";
import { seed } from "./server/catalog/seed";

// middleware.ts (not proxy.ts): OpenNext on Cloudflare does not yet support the
// Node.js proxy runtime (ADR-001). The auth cookie check is added in Phase 4.
const intl = createMiddleware(routing);

// Phase 4 (database catalog) must keep this list in step with the products that can render.
const gateOptions = {
  locales: routing.locales,
  slugs: seed.map((product) => product.slug),
};

export default function middleware(request: NextRequest) {
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
    return NextResponse.rewrite(url, { status: 404 });
  }

  return intl(request);
}

export const config = {
  matcher: [
    // Skip API routes, Next internals and any path with a file extension.
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Product paths with a dot (`/ru/catalog/x.rsc`) too: they would reach the ISR route otherwise.
    "/:locale/catalog/:path*",
  ],
};
