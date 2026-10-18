import "server-only";

import { join } from "node:path";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import type { Db } from "./client";
import type * as schema from "./schema";

/**
 * Applies the committed migrations in `drizzle/` (idempotent: applied ones are skipped).
 * Meant for PGlite: tests, CI and local development. Real databases are migrated with
 * `pnpm db:migrate` (drizzle-kit), not at request time.
 */
export async function migrate(
  db: Db,
  migrationsFolder = join(process.cwd(), "drizzle"),
): Promise<void> {
  const { migrate: run } = await import("drizzle-orm/pglite/migrator");
  await run(db as unknown as PgliteDatabase<typeof schema>, {
    migrationsFolder,
  });
}
