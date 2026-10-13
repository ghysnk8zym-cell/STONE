import { describe, expect, it } from "vitest";

import {
  isIndexingEnabled,
  robotsHeaders,
  robotsRules,
} from "@/server/indexing";

describe("indexing policy", () => {
  it.each([
    ["on", true],
    ["ON", false],
    ["off", false],
    [undefined, false],
    ["", false],
  ])("isIndexingEnabled(%s) is %s", (value, expected) => {
    expect(isIndexingEnabled(value)).toBe(expected);
  });

  it("sends noindex header when indexing is disabled", () => {
    expect(robotsHeaders(false)).toEqual([
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ]);
  });

  it("sends no robots header when indexing is enabled", () => {
    expect(robotsHeaders(true)).toEqual([]);
  });

  it("robots.txt disallows everything when indexing is disabled", () => {
    expect(robotsRules(false).rules).toEqual({ userAgent: "*", disallow: "/" });
  });

  it("robots.txt allows everything when indexing is enabled", () => {
    expect(robotsRules(true).rules).toEqual({ userAgent: "*", allow: "/" });
  });
});
