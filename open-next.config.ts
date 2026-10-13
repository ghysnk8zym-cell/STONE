import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache (R2) on the test environment; pages are static or dynamic per request.
export default defineCloudflareConfig({});
