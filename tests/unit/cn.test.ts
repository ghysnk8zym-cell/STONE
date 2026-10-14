import { describe, expect, it } from "vitest";

import { cn } from "@/components/cn";

describe("cn", () => {
  it("joins truthy parts with a space", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops false, null, undefined and empty strings", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("returns an empty string when nothing is left", () => {
    expect(cn(false, null)).toBe("");
  });
});
