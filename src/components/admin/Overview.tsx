import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { AdminOverview } from "@/server/admin/queries";

import { ProductImage } from "../account/parts";
import { Icon } from "../icons/Icon";
import { ADMIN_CARD, ADMIN_CARD_TITLE, ADMIN_MUTED } from "./parts";
import { useAdminMoney } from "./money";

/*
 * Admin Overview (Figma 1440 1077:51932, 1024 1077:55042). Cards on stone/catalog-card, r20, 28 x 24 padding at 1440:
 * the KPI row (Revenue and Orders in one card with a hairline between, a second card for the catalogue), the
 * Sales revenue chart with the Products card beside it from 1440 (stacked at 1024), and the footnote.
 * Figures come from the database. Figma also draws "Stock on hand", per-product stock and the Create Your Stone
 * requests table: the data model has no stock yet and the requests arrive in Phase 4b, so those are not drawn.
 */

const CHART_HEIGHT = 200;

/** The top of the chart: the biggest bar rounded up to a whole $1,000, at least $1,000. */
function chartTop(maxCents: number): number {
  return Math.max(100_000, Math.ceil(maxCents / 100_000) * 100_000);
}

function Kpi({
  label,
  value,
  size,
}: {
  label: string;
  value: string;
  size: "large" | "medium";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="type-catalog-product-name-lg text-stone-catalog-secondary">
        {label}
      </p>
      <p
        className={
          size === "large"
            ? "type-catalog-page-title text-stone-catalog-ink"
            : "type-catalog-page-title-56 text-stone-catalog-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}

function SalesChart({ days }: { days: AdminOverview["days"] }) {
  const t = useTranslations("admin.overview");
  const format = useFormatter();
  const money = useAdminMoney();
  const top = chartTop(Math.max(0, ...days.map((day) => day.revenueCents)));
  const axis = [top, top / 2, 0];

  return (
    <section
      aria-labelledby="admin-sales-title"
      className={`${ADMIN_CARD} flex min-w-0 flex-1 flex-col gap-5`}
    >
      <div className="flex flex-col gap-1">
        <h2 id="admin-sales-title" className={ADMIN_CARD_TITLE}>
          {t("sales.title")}
        </h2>
        <p className={ADMIN_MUTED}>{t("sales.caption")}</p>
      </div>
      {days.length === 0 ? (
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {t("sales.empty")}
        </p>
      ) : (
        <div className="flex gap-3">
          <div
            aria-hidden="true"
            className="type-footer-small text-stone-catalog-secondary relative h-[268px] w-14 shrink-0"
          >
            {axis.map((value, index) => (
              <p
                key={value}
                className="absolute left-0"
                style={{ top: 32 + index * 100 }}
              >
                {money(value, { compact: true })}
              </p>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div
              role="img"
              aria-label={t("sales.chartLabel")}
              className="border-stone-catalog-line relative flex h-[240px] items-end gap-3 border-b border-l px-4"
            >
              <span
                aria-hidden="true"
                className="bg-stone-catalog-line absolute top-[40px] right-0 left-[-1px] h-px"
              />
              <span
                aria-hidden="true"
                className="bg-stone-catalog-line absolute top-[140px] right-0 left-[-1px] h-px"
              />
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
                >
                  {day.revenueCents > 0 && (
                    <p className="type-footer-small text-stone-catalog-ink whitespace-nowrap">
                      {money(day.revenueCents, { compact: true })}
                    </p>
                  )}
                  <div
                    className="w-full rounded-t-md bg-[#514e48]"
                    style={{
                      height: Math.round(
                        (day.revenueCents / top) * CHART_HEIGHT,
                      ),
                    }}
                  />
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="type-footer-small text-stone-catalog-secondary flex gap-3 px-4 text-center"
            >
              {days.map((day) => (
                <p key={day.date.toISOString()} className="min-w-0 flex-1">
                  {format.dateTime(day.date, {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ProductsCard({ products }: { products: AdminOverview["products"] }) {
  const t = useTranslations("admin.overview");
  const money = useAdminMoney();
  return (
    <section
      aria-labelledby="admin-products-title"
      className={`${ADMIN_CARD} flex flex-col min-[90rem]:w-[380px] min-[90rem]:shrink-0`}
    >
      <div className="flex items-center justify-between gap-4 pb-3">
        <h2 id="admin-products-title" className={ADMIN_CARD_TITLE}>
          {t("products.title")}
        </h2>
        <Link
          href="/admin/products"
          className="type-button-label text-stone-catalog-ink focusv:outline-2 focusv:outline-ink-primary flex shrink-0 items-center gap-1.5 rounded-lg py-2 outline-0"
        >
          {t("products.view")}
          <Icon name="arrow" size={16} className="size-[18px]!" />
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="border-stone-catalog-line type-catalog-field-value text-stone-catalog-secondary border-t py-4">
          {t("products.empty")}
        </p>
      ) : (
        <ul className="flex list-none flex-col">
          {products.map((product) => (
            <li
              key={product.slug}
              className="border-stone-catalog-line flex items-center gap-4 border-t py-3.5"
            >
              <ProductImage
                image={product.image}
                fit={product.imageFit}
                className="h-[60px] w-20 shrink-0 rounded-lg"
                sizes="80px"
              />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <p className="type-catalog-product-name-sm text-stone-catalog-ink wrap-anywhere">
                  {product.name}
                </p>
                <p className="type-catalog-product-name-sm text-stone-catalog-ink whitespace-nowrap">
                  {money(product.priceCents)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Overview({ overview }: { overview: AdminOverview }) {
  const t = useTranslations("admin.overview");
  const money = useAdminMoney();
  return (
    <>
      <div className="flex flex-col gap-6 min-[90rem]:flex-row">
        <section
          aria-label={t("kpi.sales")}
          className={`${ADMIN_CARD} flex min-w-0 flex-1 flex-wrap items-center gap-x-12 gap-y-4`}
        >
          <Kpi
            label={t("kpi.revenue")}
            value={money(overview.revenueCents)}
            size="large"
          />
          <span
            aria-hidden="true"
            className="bg-stone-catalog-line h-[88px] w-px"
          />
          <Kpi
            label={t("kpi.orders")}
            value={String(overview.orders)}
            size="medium"
          />
        </section>
        <section
          aria-label={t("kpi.catalog")}
          className={`${ADMIN_CARD} min-[90rem]:w-[380px] min-[90rem]:shrink-0`}
        >
          <Kpi
            label={t("kpi.published")}
            value={String(overview.published)}
            size="large"
          />
        </section>
      </div>
      <div className="flex flex-col gap-6 min-[90rem]:flex-row">
        <SalesChart days={overview.days} />
        <ProductsCard products={overview.products} />
      </div>
    </>
  );
}
