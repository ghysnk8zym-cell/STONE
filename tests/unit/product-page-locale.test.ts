import { describe, expect, it, vi } from "vitest";

import { isNotFound, redirectTarget, thrown } from "./auth-helpers";

vi.mock("server-only", () => ({}));

/*
 * Phase 4a security audit F9: the product page builds `/${locale}/404` for an unknown product. The locale comes from
 * the URL, so it is checked against the known locales first: an unknown one is a plain 404 and never part of a redirect
 * target.
 */
describe("product page locale check", () => {
  it("an unknown locale is a 404, never a redirect built from the URL segment", async () => {
    const { default: ProductPage } =
      await import("@/app/[locale]/(site)/catalog/[slug]/page");
    const error = await thrown(() =>
      ProductPage({
        params: Promise.resolve({ locale: "//evil.example", slug: "x" }),
      } as never),
    );
    expect(redirectTarget(error)).toBeNull();
    expect(isNotFound(error)).toBe(true);
  });
});
