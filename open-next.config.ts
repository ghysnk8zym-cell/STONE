import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Serve prerendered pages (e.g. /ru, /en, robots.txt) from the build output instead of
// re-rendering them per request. Read-only cache: no R2 bucket, no ISR revalidation.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
