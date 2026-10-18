import { useFormatter, useTranslations } from "next-intl";

/**
 * Labels of the catalog data on the account screens (product name, material, finish) and money.
 * Names prefer the database translation (what an admin edited), then `messages` (the seed's source),
 * then the slug, so a product without copy never renders empty. Works in server and client components.
 */
export function useAccountLabels() {
  const c = useTranslations("catalog");
  const t = useTranslations("account.orders");
  const format = useFormatter();
  const has = (key: string) => c.has(key as never);
  const text = (key: string) => c(key as never);

  return {
    name(product: { slug: string; name: string | null }): string {
      if (product.name) return product.name;
      const key = `products.${product.slug}.name`;
      return has(key) ? text(key) : product.slug;
    },
    material(material: string): string {
      const key = `material.${material}`;
      return has(key) ? text(key) : material;
    },
    finish(finish: string): string {
      const key = `finish.${finish}`;
      return has(key) ? text(key) : finish;
    },
    quantity(count: number): string {
      return t("quantity", { count });
    },
    /** "Polished · Quantity 1". */
    detail(item: { finish: string; quantity: number }): string {
      return [this.finish(item.finish), this.quantity(item.quantity)].join(
        " · ",
      );
    },
    /** Integer cents as a currency amount ("$240.00" / "240,00 $"). */
    money(cents: number): string {
      return format.number(cents / 100, { style: "currency", currency: "USD" });
    },
  };
}
