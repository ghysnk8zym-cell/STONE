import "server-only";

import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { getServerEnv } from "../env";
import { migrate } from "./migrate";
import * as schema from "./schema";

/**
 * The database seen by application code. Every driver (Neon HTTP, node-postgres, PGlite) is a
 * Drizzle PgDatabase over the same schema, so callers never know which one is behind it.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbDriver = "neon" | "pg" | "pglite";

const NEON_HOST = /(^|\.)neon\.tech$/i;

/**
 * Picks the driver from DATABASE_URL (ADR-002). Returns null when no URL is configured
 * (no-database mode). Never includes the URL in an error: it contains credentials.
 */
export function selectDriver(url: string | undefined): DbDriver | null {
  if (!url) return null;
  if (url.startsWith("pglite://")) return "pglite";
  if (/^postgres(ql)?:\/\//.test(url)) {
    try {
      return NEON_HOST.test(new URL(url).hostname) ? "neon" : "pg";
    } catch {
      // fall through to the generic error
    }
  }
  throw new Error(
    "Unsupported DATABASE_URL: use a postgres://, postgresql:// or pglite:// URL",
  );
}

/** `pglite://memory` is a throwaway in-memory database; anything else is a data directory. */
function pgliteDataDir(url: string): string | undefined {
  const path = url.slice("pglite://".length);
  return path === "" || path === "memory" ? undefined : path;
}

// Each driver is imported only when selected, so the other two never load (and, where the
// bundler allows it, never ship) on a host that does not use them.
async function createNeon(url: string): Promise<Db> {
  const [{ neon }, { drizzle }] = await Promise.all([
    import("@neondatabase/serverless"),
    import("drizzle-orm/neon-http"),
  ]);
  return drizzle({ client: neon(url), schema });
}

async function createPg(url: string): Promise<Db> {
  const [{ Pool }, { drizzle }] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
  ]);
  return drizzle({ client: new Pool({ connectionString: url }), schema });
}

async function createPglite(url: string): Promise<Db> {
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);
  const db: Db = drizzle({ client: new PGlite(pgliteDataDir(url)), schema });
  // PGlite is local, test and CI only: bring it up to date so `pnpm dev` needs no setup step.
  await migrate(db);
  return db;
}

/** Creates a new database connection for `url`, or null when it is unset. Not cached. */
export async function createDb(url: string | undefined): Promise<Db | null> {
  switch (selectDriver(url)) {
    case null:
      return null;
    case "neon":
      return createNeon(url!);
    case "pg":
      return createPg(url!);
    case "pglite":
      return createPglite(url!);
  }
}

// Cached on globalThis so dev-server module reloads do not open a second connection
// (a PGlite data directory can only be held by one instance).
const globalForDb = globalThis as typeof globalThis & {
  __stoneDb?: { url: string; db: Promise<Db | null> };
};

/**
 * Round-trips `select 1` through the shared database. Resolves false when no database is
 * configured; rejects when one is configured but unreachable.
 */
export async function pingDb(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.execute(sql`select 1`);
  return true;
}

/**
 * The shared database for this process, or null without DATABASE_URL.
 * Async because the selected driver is imported on first use.
 */
export function getDb(): Promise<Db | null> {
  const url = getServerEnv().DATABASE_URL;
  if (!url) return Promise.resolve(null);

  const cached = globalForDb.__stoneDb;
  if (cached?.url === url) return cached.db;

  const db = createDb(url);
  globalForDb.__stoneDb = { url, db };
  // A failed start (e.g. a sleeping database) must not poison later requests.
  db.catch(() => {
    if (globalForDb.__stoneDb?.db === db) globalForDb.__stoneDb = undefined;
  });
  return db;
}
