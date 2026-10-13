import type { PlatformAdapter } from "./types";

/** Default adapter for Node.js, Vercel, Netlify and Docker. */
export const nodePlatform: PlatformAdapter = {
  name: "node",
};
