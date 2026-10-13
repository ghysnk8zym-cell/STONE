import type { NextConfig } from "next";

import { isIndexingEnabled, robotsHeaders } from "./src/server/indexing";

// cacheComponents/partialPrefetching are intentionally off: OpenNext on Cloudflare Workers
// has open bugs with Cache Components (see docs/adr/ADR-001 and the Phase 1 ledger).
const nextConfig: NextConfig = {
  async headers() {
    const headers = robotsHeaders(isIndexingEnabled(process.env.INDEXING));
    return headers.length > 0 ? [{ source: "/:path*", headers }] : [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
