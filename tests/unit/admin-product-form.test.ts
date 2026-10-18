import { describe, expect, it } from "vitest";

import {
  centsToDollars,
  dollarsToCents,
  slugify,
  toPayload,
  wholeNumber,
  type ProductFormValues,
} from "@/components/admin/product-form-values";

const values: ProductFormValues = {
  slug: "x",
  nameRu: "Камень",
  nameEn: "Stone",
  descriptionRu: "",
  descriptionEn: "",
  material: "marble",
  color: "grey",
  colorGroup: "grey",
  finish: "honed",
  lengthMm: "600",
  widthMm: "300",
  thicknessMm: "20",
  price: "240.50",
  oldPrice: "",
  discountPercent: "",
  image: "images/catalog/grey-marble",
};

describe("admin product form values", () => {
  it("turns typed dollars into integer cents and back", () => {
    expect(dollarsToCents("240")).toBe(24000);
    expect(dollarsToCents("240.5")).toBe(24050);
    expect(dollarsToCents("240,50")).toBe(24050);
    expect(dollarsToCents(" 0.99 ")).toBe(99);
    expect(centsToDollars(24000)).toBe("240");
    expect(centsToDollars(24050)).toBe("240.50");
    expect(centsToDollars(5)).toBe("0.05");
    expect(centsToDollars(null)).toBe("");
  });

  it("does not read what is not an amount (no silent zero)", () => {
    for (const bad of [
      "",
      "abc",
      "12.345",
      "-5",
      "1e3",
      "$240",
      "1,000",
      "٣",
    ]) {
      expect(dollarsToCents(bad), bad).toBeNull();
    }
    for (const bad of ["", "1.5", "-1", "12a", "1234567"]) {
      expect(wholeNumber(bad), bad).toBeNull();
    }
    expect(wholeNumber(" 20 ")).toBe(20);
  });

  it("suggests a lowercase slug from the English name", () => {
    expect(slugify("Black Marble")).toBe("black-marble");
    expect(slugify("  Café   Noir #2 ")).toBe("cafe-noir-2");
    expect(slugify("Мрамор")).toBe("");
    expect(slugify("a".repeat(120)).length).toBeLessThanOrEqual(80);
    expect(slugify("--x--")).toBe("x");
  });

  it("builds the payload and names the numbers it could not read", () => {
    const ok = toPayload(values);
    expect(ok).toMatchObject({
      priceCents: 24050,
      lengthMm: 600,
      oldPriceCents: null,
      discountPercent: null,
      unreadable: [],
    });
    const bad = toPayload({
      ...values,
      price: "free",
      lengthMm: "x",
      oldPrice: "9,999.9",
      discountPercent: "10%",
    });
    expect(bad.priceCents).toBeNull();
    expect(bad.unreadable.sort()).toEqual([
      "discountPercent",
      "lengthMm",
      "oldPrice",
      "price",
    ]);
    // an optional field that was typed but is unreadable is reported, not dropped
    expect(bad.oldPriceCents).toBeNull();
  });
});
