import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

/*
 * Route gate (src/lib/route-gate.ts, applied in src/middleware.ts).
 * - I1: a known slug in another case is 308-redirected to its lowercase form, and an unknown slug
 *   never reaches the on-demand ISR route, so no request can write a cache entry that shadows a
 *   prerendered product page (case-insensitive file systems) or grows the cache without bound.
 * - I2: the localised 404 is a normal server render, so it works without JavaScript.
 */

const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;

test.describe("route gate", () => {
  test("a wrong-case slug redirects to the lowercase product", async ({
    request,
  }) => {
    const redirect = await request.get("/ru/catalog/Black-Marble?x=1", {
      maxRedirects: 0,
    });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers()["location"]).toBe("/ru/catalog/black-marble?x=1");
  });

  test("wrong-case and unknown slugs never take the real page offline", async ({
    request,
  }) => {
    for (let i = 0; i < 2; i += 1) {
      await request.get("/ru/catalog/Black-Marble");
      await request.get("/ru/catalog/BLACK-MARBLE", { maxRedirects: 0 });
      // Next strips `.rsc` before the middleware, so this is the wrong-case slug again
      const data = await request.get("/ru/catalog/Black-Marble.rsc", {
        maxRedirects: 0,
      });
      expect(data.status()).toBe(308);
      for (const path of [
        "/ru/catalog/Fresh-One",
        "/en/catalog/no.such.stone",
      ]) {
        const unknown = await request.get(path);
        expect(unknown.status(), path).toBe(404);
        // rendered by the dynamic 404 page, never by the ISR product route
        expect(unknown.headers()["x-nextjs-cache"], path).toBeUndefined();
      }
    }
    const real = await request.get("/ru/catalog/black-marble");
    expect(real.status()).toBe(200);
    expect(await real.text()).toContain(
      ru.catalog.products["black-marble"].name,
    );
  });

  test("a deeper path under a product is a 404", async ({ request }) => {
    const response = await request.get("/en/catalog/black-marble/extra");
    expect(response.status()).toBe(404);
  });
});

test.describe("404 without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    for (const path of ["/catalog/nope", "/foo"]) {
      test(`${locale}${path} is server-rendered`, async ({ page }) => {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status()).toBe(404);

        const copy = MESSAGES[locale].pages.notFound;
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("h1")).toHaveText(copy.title);
        await expect(page.getByText(copy.body)).toBeVisible();
        await expect(
          page.getByRole("main").getByRole("link", { name: copy.toCatalog }),
        ).toHaveAttribute("href", `/${locale}/catalog`);
        await expect(page).toHaveTitle(MESSAGES[locale].meta.notFound.title);
        await expect(
          page.locator('meta[name="robots"]').first(),
        ).toHaveAttribute("content", /noindex/);
      });
    }
  }
});
