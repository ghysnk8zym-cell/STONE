import { z } from "zod";

import { COLOR_GROUPS, FINISHES, MATERIALS, SORTS } from "./types";
import type { CatalogQuery, Product } from "./types";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse URL search params; any unknown or stale value is dropped, never thrown. */
export function parseCatalogQuery(params: Params): CatalogQuery {
  const pick = <T extends string>(
    values: readonly [T, ...T[]],
    key: string,
  ): T | undefined => {
    const parsed = z.enum(values).safeParse(first(params[key]));
    return parsed.success ? parsed.data : undefined;
  };

  const query: CatalogQuery = { sort: pick(SORTS, "sort") ?? "name-asc" };

  const material = pick(MATERIALS, "material");
  if (material) query.material = material;
  const color = pick(COLOR_GROUPS, "color");
  if (color) query.color = color;
  const finish = pick(FINISHES, "finish");
  if (finish) query.finish = finish;
  if (z.enum(["1", "true"]).safeParse(first(params.sale)).success)
    query.sale = true;

  const q = first(params.q)?.trim().slice(0, 100).trim();
  if (q) query.q = q;

  return query;
}

/** The Figma badge value stored in the seed. */
export function discountPercent(p: Product): number | undefined {
  return p.discountPercent;
}
