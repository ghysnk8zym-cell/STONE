import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

// middleware.ts (not proxy.ts): OpenNext on Cloudflare does not yet support the
// Node.js proxy runtime (ADR-001). The auth cookie check is added in Phase 4.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and any path with a file extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
