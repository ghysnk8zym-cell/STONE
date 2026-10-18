import type { PlatformAdapter } from "./types";

/** Default adapter for Node.js, Vercel, Netlify and Docker. */
export const nodePlatform: PlatformAdapter = {
  name: "node",
  // Rule (docs/SECURITY.md): exactly one reverse proxy in front of the Node server, which
  // overwrites or appends to X-Forwarded-For. The last hop is the address that proxy saw; hops to
  // its left came from the client and are ignored. Without such a proxy the value is
  // client-controlled and rate limiting can be evaded.
  clientIp(headers) {
    const hops = (headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    return hops.at(-1) ?? null;
  },
};
