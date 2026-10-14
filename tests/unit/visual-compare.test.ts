import { describe, expect, it } from "vitest";

import {
  formatResults,
  mismatchPercent,
  parseReferenceKey,
} from "../../scripts/visual-compare.mjs";

describe("formatResults", () => {
  const rows = [
    { id: "a", width: 1440, mismatch: "1.00", impl: "10x10", figma: "10x10" },
    {
      id: "a",
      width: 390,
      mismatch: "1.00",
      impl: "10x10",
      figma: "10x10",
      sameAs: true,
    },
    {
      id: "tab",
      width: 390,
      mismatch: "89.00",
      impl: "5x5",
      figma: "5x5",
      caveat: "reference unreliable",
    },
  ];
  const text = formatResults(rows, [
    { id: "b", width: 390, reason: "hidden at this width" },
  ]);

  it("starts with the method legend before the table", () => {
    expect(text.split("\n")[0]).toMatch(/^Method:/);
    expect(text.indexOf("pixelmatch threshold 0.1")).toBeLessThan(
      text.indexOf("| id |"),
    );
  });

  it("marks reused PNGs and caveats in a notes column", () => {
    expect(text).toContain("| a | 1440 | 1.00 | 10x10 | 10x10 |  |");
    expect(text).toContain(
      "| a | 390 | 1.00 | 10x10 | 10x10 | same PNG as 1440 |",
    );
    expect(text).toContain(
      "| tab | 390 | 89.00 | 5x5 | 5x5 | reference unreliable |",
    );
  });

  it("lists the pairs that are not compared", () => {
    expect(text).toContain("| b | 390 | hidden at this width |");
  });
});

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
