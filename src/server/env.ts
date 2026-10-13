import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  APP_ENV: z
    .enum(["development", "preview", "production"])
    .default("development"),
  INDEXING: z.enum(["on", "off"]).default("off"),
  // An empty value (as in .env.example) means "not set".
  SITE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  PLATFORM: z.enum(["node", "cloudflare"]).default("node"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const SERVER_ENV_KEYS = Object.keys(
  serverEnvSchema.shape,
) as readonly string[];

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Report variable names only; values may be secrets.
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(`Invalid server environment: ${names.join(", ")}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
