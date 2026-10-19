import "server-only";

import { headers } from "next/headers";

import { getServerEnv } from "./env";

/**
 * Whether a server action call came from this site: the Origin header must equal the configured origin
 * (BETTER_AUTH_URL or SITE_URL). Unconfigured development is loopback-only; production must declare its origin.
 * Used by the mutating actions that write user data (stone requests, test checkout).
 */
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin || origin === "null") return false;
  const env = getServerEnv();
  const configured = env.BETTER_AUTH_URL ?? env.SITE_URL;
  try {
    const url = new URL(origin);
    if (origin !== url.origin) return false;
    if (configured) return origin === new URL(configured).origin;
    // Unconfigured development is loopback-only; production must declare its origin.
    return (
      env.APP_ENV === "development" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.host === h.get("host")
    );
  } catch {
    return false;
  }
}
