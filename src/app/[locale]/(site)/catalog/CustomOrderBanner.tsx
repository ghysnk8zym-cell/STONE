import { useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";

/*
 * Figma "Custom order CTA" 933:30637 (Desktop 1440 / 1024 / 768, Mobile 390): glass banner, blur 12
 * (Blur/Glass background 24), fill surface/footer, border/glass, r20. Desktop: row, p 36 / 32, title in
 * Catalog/Product title 40 (48 high). Mobile: column, gap 20, p 20 / 24, title 26/32 (Catalog/Product name).
 * Label = Section/Label 12/16 uppercase text/label; body = Catalog/Field value in text/secondary.
 * The button is Button/Pill; Create Your Stone has no page yet, so it is inert (owner decision A).
 */
export function CustomOrderBanner() {
  const t = useTranslations("pages.catalog.customOrder");
  return (
    <section
      aria-labelledby="catalog-custom-order"
      className="glass-blur border-glass bg-surface-footer flex flex-col items-start gap-5 rounded-[20px] border px-5 py-6 md:flex-row md:items-center md:justify-between md:gap-6 md:px-9 md:py-8"
    >
      <div className="flex min-w-0 flex-col gap-2 md:flex-1">
        <p className="type-section-label text-label uppercase">
          {t("eyebrow")}
        </p>
        <h2
          id="catalog-custom-order"
          className="type-catalog-product-name-lg text-primary md:text-[40px] md:leading-[48px]"
        >
          {t("title")}
        </h2>
        <p className="type-catalog-field-value text-secondary">{t("body")}</p>
      </div>
      <Button variant="pill" inert iconRight="arrow" className="shrink-0">
        {t("cta")}
      </Button>
    </section>
  );
}
