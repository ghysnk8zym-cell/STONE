import { expect, test } from "@playwright/test";

for (const width of [1920, 1440, 390, 320]) {
  for (const locale of ["ru", "en"] as const) {
    test(`${locale} public surfaces at ${width}`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "explicit viewport matrix");
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "catalog",
        "catalog/black-marble",
        "cart",
        "checkout",
        "create-your-stone",
        "sign-in",
        "sign-up",
        "sign-out",
      ]) {
        await test.step(route, async () => {
          const response = await page.goto(`/${locale}/${route}`);
          expect(response?.status()).toBe(200);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          ).toBeLessThanOrEqual(1);
          await expect(page.locator("h1")).toHaveCount(1);
          if (route === "catalog" && width >= 1024)
            await expect(page.locator("h1")).toHaveCSS("font-size", "48px");
          if (route === "sign-in") {
            expect(
              (await page.locator(".auth-scene").boundingBox())!.width,
            ).toBe(width);
            if (width >= 1024)
              expect(
                (await page.locator("[data-auth-form-column]").boundingBox())!
                  .width,
              ).toBeLessThanOrEqual(380);
          }
          if (locale === "ru" && (width === 1440 || width === 390)) {
            await page.screenshot({
              path: info.outputPath(
                `${route.replaceAll("/", "-")}-${locale}-${width}.png`,
              ),
            });
          }
        });
      }
    });
  }
}
