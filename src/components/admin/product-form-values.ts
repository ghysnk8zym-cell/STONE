/*
 * Pure helpers of the admin product form (no React): turning what the admin types into the integers the
 * server action takes, and the slug suggestion. The server validates everything again (zod); these only
 * decide what to send and what to say before sending.
 */

export type ProductFormValues = {
  slug: string;
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  material: string;
  color: string;
  colorGroup: string;
  finish: string;
  lengthMm: string;
  widthMm: string;
  thicknessMm: string;
  /** Dollars as typed ("240" or "240.50"). */
  price: string;
  oldPrice: string;
  discountPercent: string;
  image: string;
};

/** "240", "240.5", "240,50" -> integer cents; null when it is not an amount with at most two decimals. */
export function dollarsToCents(text: string): number | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Integer cents -> the text of the field ("240" or "240.50"). */
export function centsToDollars(cents: number | null): string {
  if (cents === null) return "";
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0
    ? String(whole)
    : `${whole}.${String(rest).padStart(2, "0")}`;
}

/** A whole number from digits only; null for anything else (including an empty text). */
export function wholeNumber(text: string): number | null {
  return /^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : null;
}

/** A URL slug from a name: lowercase letters and digits joined by single dashes. Empty when nothing is left. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export type ProductPayload = {
  nameRu: string;
  nameEn: string;
  descriptionRu: string;
  descriptionEn: string;
  material: string;
  color: string;
  colorGroup: string;
  finish: string;
  lengthMm: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  priceCents: number | null;
  oldPriceCents: number | null;
  discountPercent: number | null;
  image: string;
};

/**
 * What the form sends. A number the admin typed that cannot be read becomes null, which the server's schema
 * rejects as invalid, so one wrong digit never silently becomes 0. Optional numbers (old price, discount)
 * are null only when left empty.
 */
export function toPayload(
  values: ProductFormValues,
): ProductPayload & { unreadable: (keyof ProductFormValues)[] } {
  const unreadable: (keyof ProductFormValues)[] = [];
  const required = <T>(field: keyof ProductFormValues, value: T | null) => {
    if (value === null) unreadable.push(field);
    return value;
  };
  const optional = <T>(
    field: keyof ProductFormValues,
    raw: string,
    value: T | null,
  ) => {
    if (raw.trim() === "") return null;
    return required(field, value);
  };
  return {
    nameRu: values.nameRu,
    nameEn: values.nameEn,
    descriptionRu: values.descriptionRu,
    descriptionEn: values.descriptionEn,
    material: values.material,
    color: values.color,
    colorGroup: values.colorGroup,
    finish: values.finish,
    lengthMm: required("lengthMm", wholeNumber(values.lengthMm)),
    widthMm: required("widthMm", wholeNumber(values.widthMm)),
    thicknessMm: required("thicknessMm", wholeNumber(values.thicknessMm)),
    priceCents: required("price", dollarsToCents(values.price)),
    oldPriceCents: optional(
      "oldPrice",
      values.oldPrice,
      dollarsToCents(values.oldPrice),
    ),
    discountPercent: optional(
      "discountPercent",
      values.discountPercent,
      wholeNumber(values.discountPercent),
    ),
    image: values.image,
    unreadable,
  };
}
