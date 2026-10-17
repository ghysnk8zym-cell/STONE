import type { PlatformAdapter } from "./types";

/** Default adapter for Node.js, Vercel, Netlify and Docker. */
export const nodePlatform: PlatformAdapter = {
  name: "node",
  // Set by the reverse proxy in front of the Node server (Vercel, Netlify, nginx). Without a
  // proxy a client can send its own value, so rate limiting is only as strong as the proxy.
  clientIpHeaders: ["x-forwarded-for"],
};
