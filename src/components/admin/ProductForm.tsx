"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";
import type { ProductActionResult } from "@/features/admin/results";
import {
  createProduct,
  setProductPublished,
  updateProduct,
} from "@/server/admin/actions";

import { ProductImage } from "../account/parts";
import { AdminInput, AdminSelect, AdminTextarea } from "./fields";
import { useAdminMoney } from "./money";
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD_TITLE,
} from "./parts";
import {
  dollarsToCents,
  slugify,
  toPayload,
  type ProductFormValues,
} from "./product-form-values";

/*
 * The Add product / Edit product form (Figma Add product 1440 1077:52622, 1024 1077:55732): "Product details"
 * (name, description, material, colour, finish), "Dimensions" (length, width, thickness in mm), "Price & stock"
 * (the price per m2 in USD; stock is not in the data model yet), then the photo column (the product picture
 * chosen from the asset manifest, a storefront preview) and the action row (Cancel, Save draft, Publish product).
 * Figma has one name and one description; the spec asks for ru and en, so there are two of each. Everything is validated
 * again by the server action (zod); this form only reads what was typed and shows the answer.
 */

/** A catalog picture of the asset manifest; `fit` is how the storefront crops it (studio slabs are not cropped). */
export type ImageOption = {
  value: string;
  label: string;
  fit: "cover" | "contain";
};
export type EnumOption = { value: string; label: string };

type Props = {
  mode: "create" | "edit";
  initial: ProductFormValues;
  /** The product's current state when editing. */
  published?: boolean;
  revision?: number;
  options: {
    material: EnumOption[];
    color: EnumOption[];
    colorGroup: EnumOption[];
    finish: EnumOption[];
    image: ImageOption[];
  };
};

// The server schema names the price fields priceCents / oldPriceCents; the form fields are in dollars.
const FIELD_OF: Record<string, string> = {
  priceCents: "price",
  oldPriceCents: "oldPrice",
};

export function ProductForm({
  mode,
  initial,
  published,
  revision,
  options,
}: Props) {
  const t = useTranslations("admin.form");
  const locale = useLocale();
  const router = useRouter();
  const money = useAdminMoney();
  const [values, setValues] = useState(initial);
  // Keep the token paired with the original inputs, even if a refresh brings newer props.
  const [expectedRevision] = useState(revision);
  // Until the admin types a slug, it follows the English name.
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set =
    <K extends keyof ProductFormValues>(key: K) =>
    (value: string) => {
      setValues((current) => {
        const next = { ...current, [key]: value };
        if (key === "nameEn" && !slugTouched) next.slug = slugify(value);
        return next;
      });
    };

  const unreadable = t("errors.number");
  const invalid = t("errors.invalid");

  function fail(result: Extract<ProductActionResult, { ok: false }>) {
    const next: Record<string, string> = {};
    for (const field of result.fields ?? []) {
      const key = FIELD_OF[field] ?? field;
      next[key] =
        result.code === "slug-taken" ? t("errors.slugTaken") : invalid;
    }
    setErrors(next);
    setFormError(
      result.code === "invalid" || result.code === "slug-taken"
        ? t("errors.summary")
        : t(`errors.${result.code}`),
    );
  }

  function submit(publish: boolean) {
    const { unreadable: bad, ...payload } = toPayload(values);
    const found: Record<string, string> = {};
    for (const field of bad) found[field] = unreadable;
    if (mode === "create" && values.slug === "") found.slug = invalid;
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError(t("errors.summary"));
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const input = { ...payload, published: publish };
      let result: ProductActionResult;
      try {
        result =
          mode === "create"
            ? await createProduct({ ...input, slug: values.slug })
            : await updateProduct(initial.slug, input, expectedRevision);
      } catch {
        // The action threw (the database timed out, a 5xx): a rejected promise inside a transition would go to the
        // error boundary and the admin would lose the form. Show the message and keep what was typed.
        setFormError(t("errors.generic"));
        return;
      }
      if (!result.ok) return fail(result);
      router.push("/admin/products");
      router.refresh();
    });
  }

  function unpublish() {
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await setProductPublished(
          initial.slug,
          false,
          expectedRevision,
        );
        if (!result.ok) {
          setFormError(t(`errors.${result.code}`));
          return;
        }
      } catch {
        setFormError(t("errors.generic"));
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  const cents = dollarsToCents(values.price);
  const previewName = (locale === "en" ? values.nameEn : values.nameRu) || "—";
  const materialLabel =
    options.material.find((o) => o.value === values.material)?.label ?? "";
  const fit =
    options.image.find((o) => o.value === values.image)?.fit ?? "cover";

  return (
    <form
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-6"
      aria-busy={pending}
    >
      <div className="flex flex-col gap-8 min-[90rem]:flex-row min-[90rem]:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <section
            className="flex flex-col gap-5"
            aria-labelledby="form-details"
          >
            <h2 id="form-details" className={ADMIN_CARD_TITLE}>
              {t("details")}
            </h2>
            {mode === "create" && (
              <AdminInput
                label={t("slug")}
                name="slug"
                value={values.slug}
                hint={t("slugHint")}
                error={errors.slug}
                maxLength={80}
                onChange={(value) => {
                  setSlugTouched(true);
                  set("slug")(value);
                }}
              />
            )}
            <AdminInput
              label={t("nameRu")}
              name="nameRu"
              value={values.nameRu}
              error={errors.nameRu}
              maxLength={120}
              onChange={set("nameRu")}
            />
            <AdminInput
              label={t("nameEn")}
              name="nameEn"
              value={values.nameEn}
              error={errors.nameEn}
              maxLength={120}
              onChange={set("nameEn")}
            />
            <AdminTextarea
              label={t("descriptionRu")}
              name="descriptionRu"
              value={values.descriptionRu}
              error={errors.descriptionRu}
              maxLength={1000}
              onChange={set("descriptionRu")}
            />
            <AdminTextarea
              label={t("descriptionEn")}
              name="descriptionEn"
              value={values.descriptionEn}
              error={errors.descriptionEn}
              maxLength={1000}
              onChange={set("descriptionEn")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminSelect
                label={t("material")}
                name="material"
                value={values.material}
                error={errors.material}
                options={options.material}
                onChange={set("material")}
              />
              <AdminSelect
                label={t("color")}
                name="color"
                value={values.color}
                error={errors.color}
                options={options.color}
                onChange={set("color")}
              />
              <AdminSelect
                label={t("colorGroup")}
                name="colorGroup"
                value={values.colorGroup}
                error={errors.colorGroup}
                options={options.colorGroup}
                onChange={set("colorGroup")}
              />
              <AdminSelect
                label={t("finish")}
                name="finish"
                value={values.finish}
                error={errors.finish}
                options={options.finish}
                onChange={set("finish")}
              />
            </div>
          </section>

          <div className="bg-stone-catalog-line h-px" />
          <section
            className="flex flex-col gap-5"
            aria-labelledby="form-dimensions"
          >
            <h2 id="form-dimensions" className={ADMIN_CARD_TITLE}>
              {t("dimensions")}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <AdminInput
                label={t("length")}
                name="lengthMm"
                unit={t("mm")}
                inputMode="numeric"
                value={values.lengthMm}
                error={errors.lengthMm}
                onChange={set("lengthMm")}
              />
              <AdminInput
                label={t("width")}
                name="widthMm"
                unit={t("mm")}
                inputMode="numeric"
                value={values.widthMm}
                error={errors.widthMm}
                onChange={set("widthMm")}
              />
              <AdminInput
                label={t("thickness")}
                name="thicknessMm"
                unit={t("mm")}
                inputMode="numeric"
                value={values.thicknessMm}
                error={errors.thicknessMm}
                onChange={set("thicknessMm")}
              />
            </div>
          </section>

          <div className="bg-stone-catalog-line h-px" />
          <section className="flex flex-col gap-5" aria-labelledby="form-price">
            <h2 id="form-price" className={ADMIN_CARD_TITLE}>
              {t("price")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput
                label={t("pricePerM2")}
                name="price"
                prefix="$"
                unit={t("usd")}
                inputMode="decimal"
                value={values.price}
                error={errors.price}
                onChange={set("price")}
              />
              <AdminInput
                label={t("oldPrice")}
                name="oldPrice"
                prefix="$"
                unit={t("usd")}
                inputMode="decimal"
                value={values.oldPrice}
                error={errors.oldPrice}
                hint={t("oldPriceHint")}
                onChange={set("oldPrice")}
              />
              <AdminInput
                label={t("discount")}
                name="discountPercent"
                unit="%"
                inputMode="numeric"
                value={values.discountPercent}
                error={errors.discountPercent}
                hint={t("discountHint")}
                onChange={set("discountPercent")}
              />
            </div>
            <p className="type-footer-small text-stone-catalog-secondary">
              {t("placeholderPrices")}
            </p>
          </section>
        </div>

        <span
          aria-hidden="true"
          className="bg-stone-catalog-line w-px max-[89.99rem]:hidden"
        />
        <div className="flex min-w-0 flex-col gap-6 min-[90rem]:w-[411px] min-[90rem]:shrink-0">
          <section
            className="flex flex-col gap-5"
            aria-labelledby="form-photos"
          >
            <h2 id="form-photos" className={ADMIN_CARD_TITLE}>
              {t("photos")}
            </h2>
            <ProductImage
              image={values.image}
              fit={fit}
              className="aspect-[411/400] w-full rounded-xl"
              sizes="(min-width: 1440px) 411px, 60vw"
            />
            <AdminSelect
              label={t("image")}
              name="image"
              value={values.image}
              error={errors.image}
              hint={t("imageHint")}
              options={options.image}
              onChange={set("image")}
            />
          </section>
          <div className="bg-stone-catalog-line h-px" />
          <section
            className="flex flex-col gap-1.5"
            aria-label={t("preview")}
            data-testid="storefront-preview"
          >
            <h2 className={ADMIN_CARD_TITLE}>{t("preview")}</h2>
            <p className="type-catalog-product-title text-stone-catalog-ink wrap-anywhere">
              {previewName}
            </p>
            <p className="type-catalog-meta text-stone-catalog-secondary">
              {t("previewMeta", {
                material: materialLabel,
                l: values.lengthMm || "—",
                w: values.widthMm || "—",
                d: values.thicknessMm || "—",
              })}
            </p>
            <p className="type-catalog-product-name-lg text-stone-catalog-ink">
              {cents === null ? "—" : money(cents)} {t("perM2")}
            </p>
          </section>
        </div>
      </div>

      {formError && (
        <p role="alert" className="type-catalog-field-value text-[#9b3d33]">
          {formError}
        </p>
      )}
      <div className="border-stone-catalog-line flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/admin/products")}
          className="type-button-label text-stone-catalog-ink focusv:outline-2 focusv:outline-ink-primary rounded-lg px-1 py-2 outline-0"
        >
          {t("cancel")}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {mode === "edit" && published ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={unpublish}
                className={ADMIN_BUTTON_SECONDARY}
              >
                {t("unpublish")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(true)}
                className={ADMIN_BUTTON_PRIMARY}
              >
                {t("saveChanges")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(false)}
                className={ADMIN_BUTTON_SECONDARY}
              >
                {t("saveDraft")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(true)}
                className={ADMIN_BUTTON_PRIMARY}
              >
                {t("publish")}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
