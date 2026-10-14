import { describe, expect, it } from "vitest";

import {
  mismatchPercent,
  parseReferenceKey,
} from "../../scripts/visual-compare.mjs";

describe("parseReferenceKey", () => {
  it("splits a reference key into data-qa id and width", () => {
    expect(parseReferenceKey("button-pill-default-1440")).toEqual({
      id: "button-pill-default",
      width: 1440,
      key: "button-pill-default-1440",
    });
    expect(parseReferenceKey("site-footer-390")?.width).toBe(390);
  });

  it("rejects keys without a known width", () => {
    expect(parseReferenceKey("site-footer-768")).toBeNull();
    expect(parseReferenceKey("site-footer")).toBeNull();
  });
});

describe("mismatchPercent", () => {
  it("returns the share of differing pixels as a percentage", () => {
    expect(mismatchPercent(250, 100, 100)).toBe(2.5);
  });

  it("returns 0 when no pixel differs", () => {
    expect(mismatchPercent(0, 10, 10)).toBe(0);
  });

  it("rounds to two decimals", () => {
    expect(mismatchPercent(1, 3, 1)).toBe(33.33);
  });

  it("returns 100 when every pixel differs", () => {
    expect(mismatchPercent(40, 8, 5)).toBe(100);
  });

  it("throws for a non-positive size", () => {
    expect(() => mismatchPercent(0, 0, 10)).toThrow("Invalid image size");
    expect(() => mismatchPercent(0, 10, 0)).toThrow("Invalid image size");
    expect(() => mismatchPercent(0, -1, 10)).toThrow("Invalid image size");
  });
});
