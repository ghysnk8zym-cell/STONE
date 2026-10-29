import { beforeEach, describe, expect, it, vi } from "vitest";
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

const localeCalls = vi.hoisted(() => ({
  translate: vi.fn(),
  setLocale: vi.fn(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (options: unknown) => {
    localeCalls.translate(options);
    return (key: string) => key;
  },
  setRequestLocale: localeCalls.setLocale,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/components/buttons/Button", () => ({ Button: () => null }));

describe("reviews locale validation", () => {
  beforeEach(() => vi.clearAllMocks());
  for (const locale of ["ru", "en"] as const) {
    it(locale + ": metadata uses validated locale", async () => {
      const { generateMetadata } =
        await import("@/app/[locale]/(site)/reviews/page");
      expect(
        await generateMetadata({
          params: Promise.resolve({ locale }),
        } as never),
      ).toEqual({ title: "title", description: "description" });
      expect(localeCalls.translate).toHaveBeenCalledWith({
        locale,
        namespace: "pages.reviews",
      });
    });
    it(locale + ": page sets validated locale", async () => {
      const { default: Page } =
        await import("@/app/[locale]/(site)/reviews/page");
      await Page({ params: Promise.resolve({ locale }) } as never);
      expect(localeCalls.setLocale).toHaveBeenCalledWith(locale);
    });
  }
  for (const locale of ["fr", "", "//evil.example"]) {
    it(
      JSON.stringify(locale) +
        ": invalid locale stops metadata and page before translation",
      async () => {
        const { default: Page, generateMetadata } =
          await import("@/app/[locale]/(site)/reviews/page");
        await expect(
          generateMetadata({ params: Promise.resolve({ locale }) } as never),
        ).rejects.toThrow("NOT_FOUND");
        await expect(
          Page({ params: Promise.resolve({ locale }) } as never),
        ).rejects.toThrow("NOT_FOUND");
        expect(localeCalls.translate).not.toHaveBeenCalled();
        expect(localeCalls.setLocale).not.toHaveBeenCalled();
      },
    );
  }
});
