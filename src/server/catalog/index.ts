import "server-only";

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

/** The static implementation; Phase 4 swaps in a database-backed repository. */
export const catalog: CatalogRepository = createStaticRepository(seed);
