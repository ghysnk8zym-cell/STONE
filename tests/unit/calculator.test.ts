import { describe, expect, it } from "vitest";

import { calculate, formatArea, parseDecimal } from "@/lib/calculator";

describe("parseDecimal", () => {
  it("parses comma decimals", () => {
    expect(parseDecimal("2,5")).toBe(2.5);
    expect(parseDecimal("2.5")).toBe(2.5);
    expect(parseDecimal(" 2 ")).toBe(2);
  });

  it("accepts thousands groups of three separated by a space, NBSP or NNBSP", () => {
    // ru formats 10 000 with NBSP/NNBSP, and the range error itself prints «10 000»
    expect(parseDecimal("1 000")).toBe(1000);
    expect(parseDecimal("10 000")).toBe(10000);
    expect(parseDecimal("10 000,5")).toBe(10000.5);
    expect(parseDecimal(" 1 000 000.25 ")).toBe(1000000.25);
  });

  it("rejects malformed input", () => {
    for (const bad of [
      "",
      "  ",
      "2,5,1",
      "2.5.1",
      "2,5.1",
      "abc",
      "1e3",
      "-2",
      "+2",
      "1 00",
      "1 0000",
      "1000 000",
      "1  000",
      "1\t000",
      "1 000 00",
      "1 000,",
      "1,000.5",
      ".",
    ]) {
      expect(parseDecimal(bad), bad).toBeNull();
    }
  });
});

describe("calculate", () => {
  it("computes 2 m² x 24000", () => {
    expect(calculate({ mode: "area", area: "2" }, 24000)).toEqual({
      ok: true,
      surfaceM2: 2,
      extraM2: 0.2,
      orderM2: 2.2,
      unitCents: 24000,
      totalCents: 52800,
    });
  });

  it("wall 2 x 1 equals area 2", () => {
    expect(
      calculate({ mode: "wall", length: "2", height: "1" }, 24000),
    ).toEqual(calculate({ mode: "area", area: "2" }, 24000));
  });

  it("charcoal 2 m² x 3800", () => {
    const r = calculate({ mode: "area", area: "2" }, 3800);
    expect(r.ok && r.totalCents).toBe(8360);
  });

  it("empty input is invalid", () => {
    expect(calculate({ mode: "area", area: "" }, 24000)).toEqual({
      ok: false,
      field: "area",
      reason: "invalid",
    });
  });

  it("0 and 10000.01 are out of range", () => {
    expect(calculate({ mode: "area", area: "0" }, 100)).toEqual({
      ok: false,
      field: "area",
      reason: "range",
    });
    expect(calculate({ mode: "area", area: "10000.01" }, 100)).toEqual({
      ok: false,
      field: "area",
      reason: "range",
    });
    expect(calculate({ mode: "area", area: "10000" }, 100)).toEqual({
      ok: false,
      field: "area",
      reason: "capacity",
    });
    expect(calculate({ mode: "area", area: "0.01" }, 100).ok).toBe(true);
  });

  it("wall 101 m length is out of range on length", () => {
    expect(
      calculate({ mode: "wall", length: "101", height: "2" }, 100),
    ).toEqual({
      ok: false,
      field: "length",
      reason: "range",
    });
  });

  it("reports height when length is valid", () => {
    expect(
      calculate({ mode: "wall", length: "2", height: "abc" }, 100),
    ).toEqual({
      ok: false,
      field: "height",
      reason: "invalid",
    });
  });

  it("wall 0.01 x 0.01 rounds below the minimum surface and is rejected", () => {
    expect(
      calculate({ mode: "wall", length: "0.01", height: "0.01" }, 24000),
    ).toEqual({
      ok: false,
      field: "height",
      reason: "range",
    });
  });

  it("throws RangeError for a non-integer or negative unit price", () => {
    for (const bad of [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        () => calculate({ mode: "area", area: "2" }, bad),
        String(bad),
      ).toThrow(RangeError);
    }
    expect(calculate({ mode: "area", area: "2" }, 0).ok).toBe(true);
  });

  it("1.005 m² rounds to 1.01", () => {
    const r = calculate({ mode: "area", area: "1.005" }, 100);
    expect(r.ok && r.surfaceM2).toBe(1.01);
  });
});

describe("formatArea", () => {
  it("formats with two fraction digits per locale", () => {
    expect(formatArea(2.2, "en")).toBe("2.20");
    expect(formatArea(2.2, "ru")).toBe("2,20");
    expect(formatArea(2.2, "ru-RU")).toBe("2,20");
  });
});
