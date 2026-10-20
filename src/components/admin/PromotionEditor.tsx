"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { PromotionSnapshot } from "@/features/admin/results";
import { Link, useRouter } from "@/i18n/navigation";
import { setProductPromotion } from "@/server/admin/actions";
import type { PromotionProduct } from "@/server/admin/promotion-queries";

import { ProductImage } from "../account/parts";
import { DiscountBadge, PriceRow } from "../cards/Price";
import { cn } from "../cn";
import { AdminInput, AdminSelect } from "./fields";
import { useAdminMoney } from "./money";
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
  StatusChip,
} from "./parts";
import {
  centsToDollars,
  dollarsToCents,
  wholeNumber,
} from "./product-form-values";

type Values = { price: string; oldPrice: string; discountPercent: string };
const FIELD_OF: Record<string, keyof Values> = {
  priceCents: "price",
  oldPriceCents: "oldPrice",
  discountPercent: "discountPercent",
};

/** Keyed by slug only: successful refreshes retain feedback and the updated expected prices. */
export function PromotionEditor({
  product,
  options,
}: {
  product: PromotionProduct;
  options: { value: string; label: string }[];
}) {
  const t = useTranslations("admin.promotions");
  const f = useTranslations("admin.form");
  const catalog = useTranslations("catalog");
  const status = useTranslations("admin.products.status");
  const router = useRouter();
  const money = useAdminMoney();
  const [expected, setExpected] = useState<PromotionSnapshot>({
    revision: product.revision,
    priceCents: product.priceCents,
    oldPriceCents: product.oldPriceCents,
    discountPercent: product.discountPercent,
  });
  const [values, setValues] = useState<Values>({
    price: centsToDollars(product.priceCents),
    oldPrice: centsToDollars(product.oldPriceCents),
    discountPercent:
      product.discountPercent === null ? "" : String(product.discountPercent),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {},
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const price = dollarsToCents(values.price);
  const oldPrice = values.oldPrice.trim()
    ? dollarsToCents(values.oldPrice)
    : null;
  const discount = values.discountPercent.trim()
    ? wholeNumber(values.discountPercent)
    : null;
  const material = catalog.has(`material.${product.material}` as never)
    ? catalog(`material.${product.material}` as never)
    : product.material;
  const set = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  };

  function save() {
    const unreadable: Partial<Record<keyof Values, string>> = {};
    if (price === null) unreadable.price = t("errors.field");
    if (values.oldPrice.trim() && oldPrice === null)
      unreadable.oldPrice = t("errors.field");
    if (values.discountPercent.trim() && discount === null)
      unreadable.discountPercent = t("errors.field");
    setErrors(unreadable);
    setMessage(null);
    if (price === null || Object.keys(unreadable).length) return;
    startTransition(async () => {
      try {
        const result = await setProductPromotion(
          product.slug,
          {
            priceCents: price,
            oldPriceCents: oldPrice,
            discountPercent: discount,
          },
          expected,
        );
        if (!result.ok) {
          setErrors(
            Object.fromEntries(
              (result.fields ?? [])
                .filter((field) => field in FIELD_OF)
                .map((field) => [FIELD_OF[field], t("errors.field")]),
            ),
          );
          setMessage({ ok: false, text: t(`errors.${result.code}`) });
          return;
        }
        setExpected(result.prices);
        setMessage({ ok: true, text: t("saved") });
      } catch {
        setMessage({ ok: false, text: t("errors.generic") });
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        aria-labelledby="promotion-editor-title"
        className={cn(
          ADMIN_CARD,
          "flex min-w-0 flex-col gap-[18px] px-8! py-6!",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="promotion-editor-title"
            className="type-catalog-product-title text-stone-catalog-ink min-w-0 wrap-anywhere"
          >
            {product.name}
          </h2>
          <StatusChip tone={product.published ? "published" : "draft"}>
            {status(product.published ? "published" : "draft")}
          </StatusChip>
        </div>
        <p className={ADMIN_MUTED}>
          {t(product.published ? "publishedHint" : "draftHint")}
        </p>
        <fieldset
          disabled={pending}
          className="flex min-w-0 flex-col gap-[18px]"
        >
          <AdminSelect
            label={t("product")}
            name="product"
            value={product.slug}
            options={options}
            onChange={(slug) =>
              router.push({
                pathname: "/admin/promotions",
                query: { product: slug },
              })
            }
          />
          <div className="grid min-w-0 grid-cols-2 gap-4">
            <AdminInput
              label={f("pricePerM2")}
              name="price"
              prefix="$"
              inputMode="decimal"
              value={values.price}
              onChange={set("price")}
              error={errors.price}
              maxLength={10}
            />
            <AdminInput
              label={f("oldPrice")}
              name="oldPrice"
              prefix="$"
              inputMode="decimal"
              value={values.oldPrice}
              onChange={set("oldPrice")}
              error={errors.oldPrice}
              maxLength={10}
              hint={f("oldPriceHint")}
            />
          </div>
          <AdminInput
            label={f("discount")}
            name="discountPercent"
            unit="%"
            inputMode="numeric"
            value={values.discountPercent}
            onChange={set("discountPercent")}
            error={errors.discountPercent}
            maxLength={3}
            hint={f("discountHint")}
          />
          <p className={ADMIN_MUTED}>{t("clearHint")}</p>
          <section
            aria-labelledby="promotion-summary-title"
            className="border-stone-catalog-line flex flex-col gap-4 border-t pt-4"
          >
            <h3 id="promotion-summary-title" className={ADMIN_CARD_TITLE}>
              {t("summary")}
            </h3>
            <div className="divide-stone-catalog-line grid grid-cols-2 divide-x">
              <div className="min-w-0 pr-4">
                <p className={ADMIN_MUTED}>{f("oldPrice")}</p>
                <p className={cn(ADMIN_CARD_TITLE, "wrap-anywhere")}>
                  {oldPrice === null ? t("notSet") : money(oldPrice)}
                </p>
              </div>
              <div className="min-w-0 pl-4">
                <p className={ADMIN_MUTED}>{f("pricePerM2")}</p>
                <p className={cn(ADMIN_CARD_TITLE, "wrap-anywhere")}>
                  {price === null ? t("notSet") : money(price)}
                </p>
              </div>
            </div>
          </section>
          <p className={ADMIN_MUTED}>{f("placeholderPrices")}</p>
          <div className="border-stone-catalog-line flex flex-wrap items-center gap-3 border-t pt-[18px]">
            <Link
              href={`/admin/products/${product.slug}`}
              className={ADMIN_BUTTON_SECONDARY}
            >
              {t("editProduct")}
            </Link>
            <button
              type="submit"
              disabled={pending}
              className={ADMIN_BUTTON_PRIMARY}
            >
              {t("save")}
            </button>
          </div>
        </fieldset>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={
              message.ok
                ? "type-footer-small text-success-ink"
                : "type-footer-small text-[#9b3d33]"
            }
          >
            {message.text}
          </p>
        )}
      </form>
      <aside
        aria-labelledby="promotion-preview-title"
        className="col-span-2 flex w-[420px] max-w-full flex-col gap-4 min-[90rem]:col-span-1 min-[90rem]:w-auto"
      >
        <div className={cn(ADMIN_CARD, "flex min-w-0 flex-col gap-4 p-6!")}>
          <h2 id="promotion-preview-title" className={ADMIN_CARD_TITLE}>
            {t("preview")}
          </h2>
          <p className={ADMIN_MUTED}>{t("previewHint")}</p>
          <div className="border-stone-catalog-line flex min-w-0 flex-col gap-3 rounded-[20px] border p-3">
            <div className="relative">
              <ProductImage
                image={product.image}
                fit={product.imageFit}
                className="aspect-[4/3] w-full rounded-xl"
                sizes="(min-width: 1440px) 250px, 370px"
              />
              {discount !== null && discount <= 100 && (
                <DiscountBadge
                  percent={discount}
                  className="absolute top-2 left-2"
                />
              )}
            </div>
            <div>
              <h3 className="type-catalog-product-name-lg text-stone-catalog-ink wrap-anywhere">
                {product.name}
              </h3>
              <p className={ADMIN_MUTED}>
                {f("previewMeta", {
                  material,
                  l: product.formatMm[0],
                  w: product.formatMm[1],
                  d: product.formatMm[2],
                })}
              </p>
              {price !== null ? (
                <PriceRow
                  price={{
                    amount: price / 100,
                    currency: "USD",
                    isPlaceholder: true,
                  }}
                  oldPrice={
                    oldPrice === null
                      ? undefined
                      : {
                          amount: oldPrice / 100,
                          currency: "USD",
                          isPlaceholder: true,
                        }
                  }
                />
              ) : (
                <p className={ADMIN_MUTED}>{t("notSet")}</p>
              )}
            </div>
          </div>
          {product.published ? (
            <Link
              href={`/catalog/${product.slug}`}
              className={ADMIN_BUTTON_SECONDARY}
            >
              {t("viewMaterial")}
            </Link>
          ) : (
            <p className={ADMIN_MUTED}>{t("draftPreview")}</p>
          )}
        </div>
      </aside>
    </>
  );
}
