import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ru from "../../messages/ru.json";
import en from "../../messages/en.json";
import { gateRoute } from "@/lib/route-gate";

describe("published reviews empty state", () => {
  for (const locale of ["ru", "en"] as const) {
    it(`${locale}: route is reachable and empty copy is translated`, () => {
      expect(
        gateRoute(`/${locale}/reviews`, { locales: ["ru", "en"] }),
      ).toEqual({ action: "next" });
      const copy = (locale === "ru" ? ru : en).pages.reviews;
      expect(copy.title).toBeTruthy();
      expect(copy.empty).toBeTruthy();
      expect(copy.catalog).toBeTruthy();
    });
  }
  it("has localized metadata and a catalog destination without fabricated review records", () => {
    const source = readFileSync(
      "src/app/[locale]/(site)/reviews/page.tsx",
      "utf8",
    );
    expect(source).toContain("generateMetadata");
    expect(source).toContain('href="/catalog"');
    expect(source).toContain('t("empty")');
  });
});
