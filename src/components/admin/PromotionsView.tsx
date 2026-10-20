import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { PromotionProduct } from "@/server/admin/promotion-queries";

import { ProductImage } from "../account/parts";
import { cn } from "../cn";
import { AdminSearch } from "./fields";
import { FilterForm } from "./FilterForm";
import { ADMIN_CARD, ADMIN_CARD_TITLE, ADMIN_MUTED } from "./parts";
import { PromotionEditor } from "./PromotionEditor";

/** Figma Promotions 1077:53224 / 1077:56321; product pricing fields per the approved Phase 4 spec. */
export function PromotionsView({
  products,
  shown,
  selected,
  q,
}: {
  products: PromotionProduct[];
  shown: PromotionProduct[];
  selected: PromotionProduct | null;
  q: string;
}) {
  const t = useTranslations("admin.promotions");
  return (
    <div className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start gap-6 min-[90rem]:grid-cols-[270px_minmax(0,1fr)_300px]">
      <section
        aria-labelledby="promotion-list-title"
        className={cn(ADMIN_CARD, "flex min-w-0 flex-col gap-3 p-6!")}
      >
        <h2 id="promotion-list-title" className={ADMIN_CARD_TITLE}>
          {t("products")}
        </h2>
        <FilterForm>
          <AdminSearch
            label={t("searchLabel")}
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="w-full"
          />
        </FilterForm>
        {shown.length ? (
          <ul className="flex max-h-[560px] list-none flex-col gap-1 overflow-y-auto pt-2">
            {shown.map((product) => (
              <li key={product.slug}>
                <Link
                  href={{
                    pathname: "/admin/promotions",
                    query: { product: product.slug, ...(q ? { q } : {}) },
                  }}
                  aria-current={
                    selected?.slug === product.slug ? "true" : undefined
                  }
                  className={cn(
                    "motion-hover focusv:outline-2 focusv:-outline-offset-2 focusv:outline-ink-primary border-stone-catalog-line relative flex items-center gap-3.5 border-b px-3 py-3.5 outline-0",
                    selected?.slug === product.slug
                      ? "bg-stone-catalog-photo rounded-[10px]"
                      : "hov:bg-overlay-tint-10",
                  )}
                >
                  {selected?.slug === product.slug && (
                    <span
                      aria-hidden="true"
                      className="bg-stone-catalog-ink absolute top-7 left-0 h-14 w-[3px] rounded-sm"
                    />
                  )}
                  <ProductImage
                    image={product.image}
                    fit={product.imageFit}
                    className="h-[86px] w-[86px] shrink-0 rounded-lg"
                    sizes="86px"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="type-catalog-product-name-sm text-stone-catalog-ink wrap-anywhere">
                      {product.name}
                    </span>
                    <span className={ADMIN_MUTED}>
                      {product.oldPriceCents === null
                        ? t("noOldPrice")
                        : t("onSale")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ADMIN_MUTED}>{t("none")}</p>
        )}
      </section>
      {selected ? (
        <PromotionEditor
          key={selected.slug}
          product={selected}
          options={products.map((product) => ({
            value: product.slug,
            label: product.name,
          }))}
        />
      ) : (
        <section className={ADMIN_CARD}>
          <h2 className={ADMIN_CARD_TITLE}>{t("selectProduct")}</h2>
        </section>
      )}
    </div>
  );
}
