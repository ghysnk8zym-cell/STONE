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
    /** Test checkout area ("2.20 m²"), from integer hundredths. */
    area(hundredths: number): string {
      return t("area", {
        area: format.number(hundredths / 100, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      });
    },
    /** "Polished · Quantity 1" (demo rows) or "Polished · 2.20 m²" (test checkout lines). */
    detail(item: {
      finish: string;
      quantity: number;
      areaHundredths?: number | null;
    }): string {
      const amount =
        item.areaHundredths != null
          ? this.area(item.areaHundredths)
          : this.quantity(item.quantity);
      return [this.finish(item.finish), amount].join(" · ");
    },
    /** "2.20 m² × $240.00 / m²" (test checkout lines) or "Quantity 2" (demo rows). */
    line(item: {
      quantity: number;
      priceCents: number;
      areaHundredths?: number | null;
    }): string {
      if (item.areaHundredths == null) return this.quantity(item.quantity);
      return t("areaLine", {
        area: format.number(item.areaHundredths / 100, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        price: this.money(item.priceCents),
      });
    },
    /** Stored line total of a test checkout line; price x quantity for demo rows. */
    lineTotal(item: {
      quantity: number;
      priceCents: number;
      lineTotalCents?: number | null;
    }): number {
      return item.lineTotalCents ?? item.priceCents * item.quantity;
    },
    /** "Test order T-2001" or "Demo order D-1048". */
    title(order: { number: string; kind: "demo" | "test_checkout" }): string {
      return t(order.kind === "test_checkout" ? "testOrder" : "demoOrder", {
        number: order.number,
      });
    },
    /** Integer cents as a currency amount ("$240.00" / "240,00 $"). */
    money(cents: number): string {
      return format.number(cents / 100, { style: "currency", currency: "USD" });
    },
  };
}
