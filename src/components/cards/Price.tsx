import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "../forms/Badge";

export type Price = {
  amount: number;
  currency: "USD";
  /** Illustrative price (the calculator's USD 240/m²): announced as such to screen readers. */
  isPlaceholder: boolean;
};

/*
 * Price row of the catalog / promo card (Catalog 1440 > Card / Concrete Paver 922:25516 > Price row
 * 713:515): the price in Catalog/Field value (16/22, stone/catalog-ink) and the old price in Catalog
 * refined/Meta (14/20) struck through, 8 px apart (2 px when they wrap), baseline aligned, 6 px above.
 * Figma leaves the old-price colour raw (#625d55 on the catalog screens) but binds it to
 * stone/catalog-secondary on the Home v2 instances, so the token is used.
 */

/** "$240.00 / m²" (en) or "240,00 $ / м²" (ru). */
function useMoney() {
  const format = useFormatter();
  const t = useTranslations("components.price");
  return (price: Price) =>
    `${format.number(price.amount, { style: "currency", currency: price.currency })} ${t("perSquareMetre")}`;
}

export function PriceRow({
  price,
  oldPrice,
}: {
  price: Price;
  oldPrice?: Price;
}) {
  const money = useMoney();
  const t = useTranslations("components");
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1.5">
      <p className="type-catalog-field-value text-stone-catalog-ink whitespace-nowrap">
        {money(price)}
        {price.isPlaceholder && (
          <>
            {" "}
            <span className="sr-only">{t("price.illustrative")}</span>
          </>
        )}
      </p>
      {oldPrice && (
        <p className="type-catalog-meta text-stone-catalog-secondary whitespace-nowrap">
          <span className="sr-only">{t("productCard.oldPrice")}</span>{" "}
          <s>{money(oldPrice)}</s>
          {oldPrice.isPlaceholder && (
            <>
              {" "}
              <span className="sr-only">{t("price.illustrative")}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** Discount pill: "−20%" with a real minus sign (U+2212), as in Figma. */
export function DiscountBadge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const t = useTranslations("components.productCard");
  const label = `−${percent}%`;
  return (
    <Badge className={className}>
      <span className="sr-only">{t("discount")}</span> {label}
    </Badge>
  );
}
