import { describe, expect, it } from "vitest";

import { LIMIT_KIB, parseGzipKiB } from "../../scripts/worker-size.mjs";

describe("worker size budget", () => {
  it("parses gzip KiB from wrangler output", () => {
    expect(parseGzipKiB("Total Upload: 9876.54 KiB / gzip: 2345.67 KiB")).toBe(
      2345.67,
    );
  });

  it("throws when gzip size is missing", () => {
    expect(() => parseGzipKiB("Total Upload: 10 KiB")).toThrow(
      "Could not find gzip size in wrangler output",
    );
  });

  it("throws when the gzip size is not a number", () => {
    expect(() => parseGzipKiB("Total Upload: 10 KiB / gzip: . KiB")).toThrow(
      "Could not find gzip size in wrangler output",
    );
  });

  it("limit is 3 MiB", () => {
    expect(LIMIT_KIB).toBe(3072);
  });
});
