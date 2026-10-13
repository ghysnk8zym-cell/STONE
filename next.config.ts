import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { isIndexingEnabled, robotsHeaders } from "./src/server/indexing";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Indexing is a build-time decision: the header below and robots.txt (which some hosts
// render at runtime) both read this inlined value, so they can never disagree.
const indexing = isIndexingEnabled(process.env.INDEXING) ? "on" : "off";

// cacheComponents/partialPrefetching are intentionally off: OpenNext on Cloudflare Workers
// has open bugs with Cache Components (see docs/adr/ADR-001 and the Phase 1 ledger).
const nextConfig: NextConfig = {
  env: { INDEXING: indexing },
  async headers() {
    const headers = robotsHeaders(indexing === "on");
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

export default withNextIntl(nextConfig);
