export type PlatformName = "node" | "cloudflare";

/**
 * The only seam between application code and the hosting platform (ADR-001).
 * Later phases add capabilities here (e.g. an image loader); application code
 * imports `@/server/platform` and never a platform SDK directly.
 */
export interface PlatformAdapter {
  name: PlatformName;
  /**
   * The client IP of a request, from headers this host sets itself (a client cannot choose the
   * value), or null when there is none. Used as the auth rate-limit key (docs/SECURITY.md).
   */
  clientIp(headers: Headers): string | null;
}
