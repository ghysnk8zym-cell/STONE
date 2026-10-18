import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

/*
 * Route gate (src/lib/route-gate.ts, applied in src/middleware.ts).
 * - I1: a slug in another case is 308-redirected to its lowercase form, and a segment that is not a slug never reaches the
 *   product route. Since Phase 4a the catalog is in the database, so the gate no longer knows which slugs exist: a
 *   lowercase slug of the right shape reaches `catalog/[slug]`, which is rendered per request and answers 200 or a
 *   404 that is not cached (see the comment in that page).
 * - I2: the localised 404 of the gate is a normal server render, so it works without JavaScript. A slug that
 *   has the right shape but no product is redirected by the route (307, no-store) to that same page
 *   (`/{locale}/404`): notFound() thrown during render makes Next send an empty error shell.
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
        // rendered per request (the gate's 404 page, or the product route's notFound), never from the route cache
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

test.describe("a slug with the right shape and no product", () => {
  test("is a 307 to the localised 404 page; nothing is cached for it", async ({
    page,
    request,
  }) => {
    for (let i = 0; i < 2; i += 1) {
      const redirect = await request.get("/ru/catalog/nope", {
        maxRedirects: 0,
      });
      expect(redirect.status()).toBe(307);
      expect(redirect.headers()["location"]).toBe("/ru/404");
      // rendered per request: nothing from the route cache, nothing stored for the next request
      expect(redirect.headers()["x-nextjs-cache"]).toBeUndefined();
      expect(redirect.headers()["cache-control"]).toMatch(/no-store/);

      const response = await request.get("/ru/catalog/nope");
      expect(response.status()).toBe(404);
      expect(response.headers()["x-nextjs-cache"]).toBeUndefined();
      expect(response.headers()["cache-control"]).toMatch(/no-store/);
    }
    // an English request stays English
    const en404 = await request.get("/en/catalog/nope", { maxRedirects: 0 });
    expect(en404.headers()["location"]).toBe("/en/404");

    const response = await page.goto("/ru/catalog/nope");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText(ru.pages.notFound.title);
    await expect(page).toHaveTitle(ru.meta.notFound.title);
    // the URL is the 404 page's (owner checklist)
    expect(new URL(page.url()).pathname).toBe("/ru/404");
  });
});

test.describe("404 without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    for (const path of ["/catalog/nope", "/catalog/no.such.stone", "/foo"]) {
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
