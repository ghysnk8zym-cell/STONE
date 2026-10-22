import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

const hero = (h: typeof ru.pages.home.hero) =>
  [h.line1, h.line2, h.line3, h.line4].join(" ");
const homeTitle = {
  ru: hero(en.pages.home.hero),
  en: hero(en.pages.home.hero),
};

test.describe("smoke", { tag: "@smoke" }, () => {
  test("root redirects to ru", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ru$/);
  });

  test("pages carry the security header baseline and no X-Powered-By", async ({
    request,
  }) => {
    const headers = (await request.get("/ru")).headers();
    expect(headers["content-security-policy"]).toBe(
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  for (const locale of ["ru", "en"] as const) {
    test(`${locale} renders with matching lang`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveText(homeTitle[locale]);
      await expect(page.locator("h1")).toHaveAttribute("lang", "en");
    });
  }

  // Valid against a deployed preview too: wrangler sets APP_ENV=preview, and the page is a 404 only
  // when APP_ENV=production (that case is tested in styleguide.spec.ts, `production-guard` project).
  for (const locale of ["ru", "en"] as const) {
    test(`${locale} styleguide is served outside production`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}/_styleguide`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

  test("responses are noindex by default", async ({ request }) => {
    const response = await request.get("/ru");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("robots.txt disallows all", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(await response.text()).toContain("Disallow: /");
  });

  test("invalid locale cookie falls back to ru", async ({ page, baseURL }) => {
    await page
      .context()
      .addCookies([{ name: "NEXT_LOCALE", value: "de", url: baseURL! }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/ru$/);
  });

  test("unknown locale ends in a 404 under the default locale", async ({
    request,
  }) => {
    const response = await request.get("/de");
    expect(response.status()).toBe(404);
    expect(new URL(response.url()).pathname).toBe("/ru/de");
  });

  for (const [locale, messages] of [
    ["ru", ru],
    ["en", en],
  ] as const) {
    test(`unknown ${locale} path shows a localized 404`, async ({ page }) => {
      const response = await page.goto(`/${locale}/no-such-page`);
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveText(
        messages.pages.notFound.title,
      );
    });
  }

  test("upper-case locale redirects to the canonical lower-case path", async ({
    request,
  }) => {
    const redirect = await request.get("/RU", { maxRedirects: 0 });
    expect(redirect.status()).toBe(307);
    expect(new URL(redirect.headers()["location"], "http://x").pathname).toBe(
      "/ru",
    );
    expect((await request.get("/RU")).status()).toBe(200);
  });

  test("static files are not locale-redirected", async ({ request }) => {
    expect(
      (await request.get("/favicon.ico", { maxRedirects: 0 })).status(),
    ).toBe(200);
    expect(
      (await request.get("/robots.txt", { maxRedirects: 0 })).status(),
    ).toBe(200);
  });

  test("ru home has no critical axe violations", async ({ page }) => {
    await page.goto("/ru");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
