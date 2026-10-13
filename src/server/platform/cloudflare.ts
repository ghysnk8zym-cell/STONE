import type { PlatformAdapter } from "./types";

/**
 * Cloudflare Workers via the OpenNext adapter. With `nodejs_compat`, Worker vars and
 * secrets arrive in `process.env`, so no Cloudflare SDK import is needed yet.
 */
export const cloudflarePlatform: PlatformAdapter = {
  name: "cloudflare",
};
