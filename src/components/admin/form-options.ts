import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import type { AdminProductDetail } from "@/server/admin/queries";
import { CATALOG_IMAGE_KEYS, imageFitFor } from "@/server/admin/images";
import {
  COLOR_GROUPS,
  COLORS,
  FINISHES,
  MATERIALS,
} from "@/server/catalog/types";

import type { ProductForm } from "./ProductForm";
import { centsToDollars, type ProductFormValues } from "./product-form-values";

type Options = Parameters<typeof ProductForm>[0]["options"];

/** The select options of the product form: the enum labels are the catalog messages the storefront uses. */
export async function productFormOptions(locale: string): Promise<Options> {
  const c = await getTranslations({
    locale: locale as Locale,
    namespace: "catalog",
  });
  const label = (key: string, fallback: string) =>
    c.has(key as never) ? c(key as never) : fallback;
  const enumOptions = (prefix: string, values: readonly string[]) =>
    values.map((value) => ({
      value,
      label: label(`${prefix}.${value}`, value),
    }));
  return {
    material: enumOptions("material", MATERIALS),
    color: enumOptions("color", COLORS),
    colorGroup: enumOptions("colorGroup", COLOR_GROUPS),
    finish: enumOptions("finish", FINISHES),
    // The picture is named after the product it was made for ("images/catalog/black-marble" -> Black Marble).
    image: CATALOG_IMAGE_KEYS.map((key) => ({
      value: key,
      label: label(`products.${key.split("/").pop()}.name`, key),
      fit: imageFitFor(key),
    })),
  };
}

export function emptyProductValues(): ProductFormValues {
  return {
    slug: "",
    nameRu: "",
    nameEn: "",
    descriptionRu: "",
    descriptionEn: "",
    material: MATERIALS[0],
    color: COLORS[0],
    colorGroup: COLOR_GROUPS[0],
    finish: FINISHES[0],
    lengthMm: "600",
    widthMm: "300",
    thicknessMm: "20",
    price: "",
    oldPrice: "",
    discountPercent: "",
    image: CATALOG_IMAGE_KEYS[0] ?? "",
  };
}

export function productValuesOf(
  product: AdminProductDetail,
): ProductFormValues {
  return {
    slug: product.slug,
    nameRu: product.names.ru,
    nameEn: product.names.en,
    descriptionRu: product.descriptions.ru,
    descriptionEn: product.descriptions.en,
    material: product.material,
    color: product.color,
    colorGroup: product.colorGroup,
    finish: product.finish,
    lengthMm: String(product.formatMm[0]),
    widthMm: String(product.formatMm[1]),
    thicknessMm: String(product.formatMm[2]),
    price: centsToDollars(product.priceCents),
    oldPrice: centsToDollars(product.oldPriceCents),
    discountPercent:
      product.discountPercent === null ? "" : String(product.discountPercent),
    image: product.image,
    gallery: product.gallery,
  };
}
