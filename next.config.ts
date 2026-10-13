import type { NextConfig } from "next";

// cacheComponents/partialPrefetching are intentionally off: OpenNext on Cloudflare Workers
// has open bugs with Cache Components (see docs/adr/ADR-001 and the Phase 1 ledger).
const nextConfig: NextConfig = {
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
