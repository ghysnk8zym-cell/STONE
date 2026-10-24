import { test, expect, signInInContext } from "./auth-fixtures";
import { SEEDED } from "./test-env";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

for (const width of [1920, 1440, 390, 320])
  for (const locale of ["ru", "en"] as const) {
    test(`${locale} authenticated surfaces at ${width}`, async ({
      page,
      context,
    }, info) => {
      test.skip(
        !info.project.name.endsWith("desktop"),
        "explicit viewport matrix",
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/sign-in`);
      await expect(page.getByRole("textbox").first()).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`auth-form-${locale}-${width}.png`),
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await signInInContext(context, SEEDED.admin);
      for (const route of [
        "admin",
        "admin/products",
        "admin/site-content",
        "admin/create-your-stone",
      ]) {
        expect((await page.goto(`/${locale}/${route}`))?.status()).toBe(200);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        if (width >= 1024) {
          await expect(page.locator("[data-admin-shell]")).toBeVisible();
          if (route === "admin/site-content") {
            const t = (locale === "en" ? en : ru).admin.siteContent;
            await page
              .getByLabel(t.field, { exact: true })
              .selectOption("hero.line1");
            await expect(
              page.getByLabel(t.fields.line1, { exact: true }),
            ).toBeDisabled();
            await expect(
              page.getByRole("button", { name: t.save, exact: true }),
            ).toBeDisabled();
            await expect(page.getByText(t.brandLocked)).toBeVisible();
          }
        }
        if (route === "admin/site-content")
          await page.screenshot({
            path: info.outputPath(`admin-${locale}-${width}.png`),
          });
      }
      await context.clearCookies();
      await signInInContext(context, SEEDED.client);
      for (const route of [
        "account",
        "account/orders",
        "account/profile",
        "account/favorites",
        "checkout",
      ]) {
        expect((await page.goto(`/${locale}/${route}`))?.status()).toBe(200);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
      }
    });
  }
