import type { MetadataRoute } from "next";

// No `server-only` import: next.config.ts uses this module at build time.

export function isIndexingEnabled(value: string | undefined): boolean {
  return value === "on";
}

export function robotsHeaders(
  enabled: boolean,
): { key: string; value: string }[] {
  return enabled ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
}

export function robotsRules(enabled: boolean): MetadataRoute.Robots {
  return {
    rules: enabled
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
  };
}
