import "server-only";

import type { Db } from "./client";

/** A Drizzle query that has not run yet (it runs when awaited, or inside a batch). */
type Statement = PromiseLike<unknown>;

type Batchable = { batch?: (statements: Statement[]) => Promise<unknown> };

/**
 * Runs several writes as one unit: all of them are applied or none. The statements are built from the
 * database handle it passes in, so they run inside the transaction.
 *
 * - `pg` and PGlite: an interactive `db.transaction`.
 * - Neon HTTP (Workers): the driver has no interactive transactions ("No transactions support in
 *   neon-http driver") but has `db.batch`, which sends every statement in one HTTP request and runs them
 *   in a single transaction. Chosen by the presence of `batch` on the handle.
 */
export async function writeAtomically(
  db: Db,
  build: (database: Db) => Statement[],
): Promise<void> {
  const { batch } = db as unknown as Batchable;
  if (typeof batch === "function") {
    await batch.call(db, build(db));
    return;
  }
  await db.transaction(async (tx) => {
    for (const statement of build(tx as unknown as Db)) await statement;
  });
}
