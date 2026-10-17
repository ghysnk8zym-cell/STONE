import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default (no) incremental cache: pages render per request on the Worker. The read-only
// static-assets cache could not find prerendered App Router pages with Next 16.3 and
// returned 404 (NoFallbackError) — see docs/ARCHITECTURE.md.
// Tells next.config.ts that this build is for Workers. OpenNext runs `next build` as a child of
// this process, which inherits the variable.
process.env.STONE_BUILD_TARGET = "cloudflare";

export default defineCloudflareConfig({});
