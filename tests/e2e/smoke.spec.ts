import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

const placeholderTitle = { ru: ru.placeholder.title, en: en.placeholder.title };

test.describe("smoke", { tag: "@smoke" }, () => {
  test("root redirects to ru", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ru$/);
  });

  for (const locale of ["ru", "en"] as const) {
    test(`${locale} renders with matching lang`, async ({ page }) => {
      const response = await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveText(placeholderTitle[locale]);
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
      await expect(page.locator("h1")).toHaveText(messages.notFound.title);
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
