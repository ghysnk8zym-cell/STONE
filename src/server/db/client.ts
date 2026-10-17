import "server-only";

import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { getServerEnv } from "../env";
import { migrate } from "./migrate";
import { pgliteLocation } from "./pglite-url";
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

// Each driver is imported only when selected, so the other two never load (and, where the
// bundler allows it, never ship) on a host that does not use them.
async function createNeon(url: string): Promise<Db> {
  const [{ neon }, { drizzle }] = await Promise.all([
    import("@neondatabase/serverless"),
    import("drizzle-orm/neon-http"),
  ]);
  return drizzle({ client: neon(url), schema });
}

/** The part of a pooled client error that is safe to log: never the message (it can hold the URL). */
function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "unknown";
}

/**
 * node-postgres emits `error` on the pool when the server drops an idle client (restart, idle
 * timeout). Without a listener that is an unhandled event and crashes the Node process, so log
 * the error code only and let the pool replace the client.
 */
export function attachPoolErrorHandler(pool: {
  on(event: "error", listener: (error: Error) => void): unknown;
}): void {
  pool.on("error", (error) => {
    console.error(`[db] idle pool client error: ${errorCode(error)}`);
  });
}

// node-postgres keeps a pool of open sockets. That is fine on Node hosts, where this module is
// cached for the life of the process. It must never run on Cloudflare Workers: I/O objects
// cannot be shared across requests there, and Workers use the Neon HTTP driver (ADR-002).
async function createPg(url: string): Promise<Db> {
  const [{ Pool }, { drizzle }] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
  ]);
  const pool = new Pool({ connectionString: url });
  attachPoolErrorHandler(pool);
  return drizzle({ client: pool, schema });
}

async function createPglite(url: string): Promise<Db> {
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);
  const db: Db = drizzle({ client: new PGlite(pgliteLocation(url)), schema });
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
