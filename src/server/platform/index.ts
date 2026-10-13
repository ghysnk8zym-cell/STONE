import { cloudflarePlatform } from "./cloudflare";
import { nodePlatform } from "./node";
import type { PlatformAdapter } from "./types";

export type { PlatformAdapter, PlatformName } from "./types";

export const platform: PlatformAdapter =
  process.env.PLATFORM === "cloudflare" ? cloudflarePlatform : nodePlatform;
