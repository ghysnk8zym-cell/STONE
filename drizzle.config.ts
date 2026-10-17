import { defineConfig } from "drizzle-kit";

import { pgliteLocation } from "./src/server/db/pglite-url";

// drizzle-kit does not read .env.local on its own; Next.js does, so mirror it here.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the process environment (CI, hosting dashboards).
}

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  // `db:generate` needs no database. `db:migrate` needs DATABASE_URL: a postgres:// URL
  // (Neon works over its standard connection string) or pglite://<directory>.
  ...(url?.startsWith("pglite://")
    ? {
        driver: "pglite" as const,
        dbCredentials: { url: pgliteLocation(url) ?? "memory://" },
      }
    : url
      ? { dbCredentials: { url } }
      : {}),
});
