import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { isIndexingEnabled, robotsHeaders } from "./src/server/indexing";
import { securityHeaders } from "./src/server/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Indexing is a build-time decision: the header below and robots.txt (which some hosts
// render at runtime) both read this inlined value, so they can never disagree.
const indexing = isIndexingEnabled(process.env.INDEXING) ? "on" : "off";

// The OpenNext Cloudflare build (open-next.config.ts sets this) must not ship the Node-only
// database drivers: pg cannot be bundled for Workers (it fails to resolve pg-cloudflare) and
// PGlite carries ~20 MB of WebAssembly. Workers use the Neon HTTP driver only (ADR-002).
const forWorker = process.env.STONE_BUILD_TARGET === "cloudflare";
const unavailableDriver = "./src/server/db/unavailable-driver.ts";
const nodeOnlyDrivers = [
  "pg",
  "@electric-sql/pglite",
  "drizzle-orm/node-postgres",
  "drizzle-orm/pglite",
  "drizzle-orm/pglite/migrator",
];

// cacheComponents/partialPrefetching are intentionally off: OpenNext on Cloudflare Workers
// has open bugs with Cache Components (see docs/adr/ADR-001 and the Phase 1 ledger).
const nextConfig: NextConfig = {
  // Opt-in portable artifact. The ordinary and OpenNext build paths stay unchanged.
  output:
    process.env.STONE_BUILD_TARGET === "node-standalone"
      ? "standalone"
      : undefined,
  env: { INDEXING: indexing },
  // No `X-Powered-By: Next.js` (audit F11).
  poweredByHeader: false,
  // Images are pre-optimised static files in public/ (pnpm images). One custom loader on
  // every host: no runtime optimisation, no sharp at runtime, no Cloudflare Images.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [390, 768, 1024, 1440, 1920],
    imageSizes: [],
  },
  // PGlite (local and CI database, ADR-002) loads its WebAssembly files from disk, so it must
  // run from node_modules instead of being bundled. `pg` is already external by default.
  serverExternalPackages: forWorker ? [] : ["@electric-sql/pglite"],
  async headers() {
    // The noindex header while the site is not indexed, and always the security baseline (docs/SECURITY.md).
    const headers = [...robotsHeaders(indexing === "on"), ...securityHeaders()];
    return [{ source: "/:path*", headers }];
  },
  turbopack: {
    resolveAlias: forWorker
      ? Object.fromEntries(nodeOnlyDrivers.map((id) => [id, unavailableDriver]))
      : {},
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
