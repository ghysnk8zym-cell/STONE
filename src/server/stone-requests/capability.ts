import "server-only";
import type { ServerEnv } from "../env";

/** The form must reflect the same deployment prerequisites as its mutation boundary. */
export function requestSubmissionAvailable(env: ServerEnv): boolean {
  if (!env.DATABASE_URL) return false;
  const configured = env.BETTER_AUTH_URL ?? env.SITE_URL;
  return configured
    ? ["http:", "https:"].includes(new URL(configured).protocol)
    : env.APP_ENV === "development";
}
