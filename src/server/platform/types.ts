export type PlatformName = "node" | "cloudflare";

/**
 * The only seam between application code and the hosting platform (ADR-001).
 * Later phases add capabilities here (e.g. an image loader); application code
 * imports `@/server/platform` and never a platform SDK directly.
 */
export interface PlatformAdapter {
  name: PlatformName;
  /**
   * Request headers that carry the client IP on this host, in order of trust. Used by Better Auth
   * for rate limiting, so only headers the host itself sets (and a client cannot forge) belong here.
   */
  clientIpHeaders: readonly string[];
}
