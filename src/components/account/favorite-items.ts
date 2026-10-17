import { getTranslations } from "next-intl/server";

import type { AccountProduct } from "@/server/account/queries";

import type { FavoriteItem } from "./Favorites";

/**
 * Favourites as the (client) favourite components take them: the name is the database translation, then the
 * message copy, then the slug (the same order as `useAccountLabels`), the meta line is the material.
 */
export async function toFavoriteItems(
  products: AccountProduct[],
): Promise<FavoriteItem[]> {
  const c = await getTranslations("catalog");
  const text = (key: string) => (c.has(key as never) ? c(key as never) : null);
  return products.map((product) => ({
    slug: product.slug,
    name: product.name ?? text(`products.${product.slug}.name`) ?? product.slug,
    meta: text(`material.${product.material}`) ?? product.material,
    image: product.image,
    imageFit: product.imageFit,
  }));
}
