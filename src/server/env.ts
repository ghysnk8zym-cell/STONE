import "server-only";

import { z } from "zod";

// An empty value (as in .env.example) means "not set".
const unsetIfEmpty = (v: unknown) => (v === "" ? undefined : v);

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(unsetIfEmpty, schema.optional());

const serverEnvSchema = z
  .object({
    APP_ENV: z
      .enum(["development", "preview", "production"])
      .default("development"),
    INDEXING: z.enum(["on", "off"]).default("off"),
    SITE_URL: optional(z.url()),
    PLATFORM: z.enum(["node", "cloudflare"]).default("node"),
    // Database and auth (ADR-002). Without DATABASE_URL the site runs in no-database mode.
    DATABASE_URL: optional(
      z.string().regex(/^(postgres(ql)?|pglite):\/\//, {
        error: "must be a postgres://, postgresql:// or pglite:// URL",
      }),
    ),
    BETTER_AUTH_SECRET: optional(z.string().min(32)),
    BETTER_AUTH_URL: optional(z.url()),
    // Test users created by the seed script; the seed requires all four.
    SEED_ADMIN_EMAIL: optional(z.email()),
    SEED_ADMIN_PASSWORD: optional(z.string().min(8)),
    SEED_CLIENT_EMAIL: optional(z.email()),
    SEED_CLIENT_PASSWORD: optional(z.string().min(8)),
  })
  .superRefine((env, ctx) => {
    if (env.DATABASE_URL && !env.BETTER_AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "required (at least 32 characters) when DATABASE_URL is set",
      });
    }
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
