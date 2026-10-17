import "server-only";

import { getDb, type Db } from "../db";
import { createDbRepository } from "./db-repository";
import { seed } from "./seed";
import { createStaticRepository } from "./static-repository";
import type { CatalogRepository } from "./types";

export { discountPercent, parseCatalogQuery } from "./query";
export type {
  CatalogQuery,
  CatalogRepository,
  CatalogSort,
  Color,
  ColorGroup,
  Finish,
  Localizer,
  Material,
  Product,
} from "./types";
export { COLORS, COLOR_GROUPS, FINISHES, MATERIALS, SORTS } from "./types";
export { seed as products };

const staticCatalog: CatalogRepository = createStaticRepository(seed);
const dbCatalogs = new WeakMap<Db, CatalogRepository>();

/**
 * The catalog for this request: the database repository when DATABASE_URL is set, otherwise
 * the static one (no-database mode keeps serving the 12 Phase 3 products). Async because the
 * database driver is chosen and loaded on first use; call it inside the request, not at
 * module level.
 */
export async function getCatalog(): Promise<CatalogRepository> {
  const db = await getDb();
  if (!db) return staticCatalog;
  let repository = dbCatalogs.get(db);
  if (!repository) {
    repository = createDbRepository(db);
    dbCatalogs.set(db, repository);
  }
  return repository;
}
