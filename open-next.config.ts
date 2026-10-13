import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default (no) incremental cache: pages render per request on the Worker. The read-only
// static-assets cache could not find prerendered App Router pages with Next 16.3 and
// returned 404 (NoFallbackError) — see docs/ARCHITECTURE.md.
export default defineCloudflareConfig({});
