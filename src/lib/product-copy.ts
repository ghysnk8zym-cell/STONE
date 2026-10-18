/*
 * Names and descriptions of catalog products as the public pages show them. The database copy
 * (`product_translation`, what an admin edits) wins; the messages the seed was made from are the
 * fallback for a product or a language without a stored row, and the slug is the last resort so a
 * product never renders empty (Phase 4a Task 1 ruling).
 */

type ProductCopyLike = {
  slug: string;
  copy?: Partial<Record<string, { name: string; description: string }>>;
};

/** The part of a next-intl translator for the `catalog` namespace that these helpers use. */
type CatalogMessages = {
  (key: never): string;
  has(key: never): boolean;
};

function fromMessages(
  c: CatalogMessages,
  slug: string,
  field: "name" | "description",
): string | null {
  const key = `products.${slug}.${field}` as never;
  return c.has(key) ? c(key) : null;
}

export function productName(
  product: ProductCopyLike,
  locale: string,
  c: CatalogMessages,
): string {
  return (
    product.copy?.[locale]?.name?.trim() ||
    fromMessages(c, product.slug, "name") ||
    product.slug
  );
}

export function productDescription(
  product: ProductCopyLike,
  locale: string,
  c: CatalogMessages,
): string {
  return (
    product.copy?.[locale]?.description?.trim() ||
    fromMessages(c, product.slug, "description") ||
    ""
  );
}
