import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

for (const width of [1920, 1440, 390, 320]) {
  for (const locale of ["en", "ru"] as const) {
    test(`${locale} compact journeys at ${width}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop",
        "explicit viewport matrix",
      );
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1080 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const messages = locale === "en" ? en : ru;
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      expect((await page.goto(`/${locale}`))?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText(
        /WHERE\s+DESIGN\s+MEETS\s+DURABILITY/i,
      );
      await expect(page.locator("header")).toHaveCSS("height", "60px");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: testInfo.outputPath(`home-${locale}-${width}.png`),
        fullPage: true,
      });
      for (const id of ["home-catalog", "home-promo", "home-works"]) {
        const section = page.locator(
          `section[aria-labelledby="${id}-heading"]`,
        );
        const track = section.locator("ul").locator("..");
        if (width >= 768) {
          const next = section.getByRole("button", {
            name: messages.components.carousel.next,
          });
          const prev = section.getByRole("button", {
            name: messages.components.carousel.prev,
          });
          await expect(next).not.toHaveAttribute("aria-disabled", "true");
          await next.click();
          await expect
            .poll(() => track.evaluate((el) => el.scrollLeft))
            .toBeGreaterThan(0);
          await expect(prev).not.toHaveAttribute("aria-disabled", "true");
          await prev.focus();
          await prev.press("Enter");
          await expect
            .poll(() => track.evaluate((el) => el.scrollLeft))
            .toBeLessThanOrEqual(2);
        } else {
          await track.evaluate((el) =>
            el.scrollBy({ left: 300, behavior: "instant" }),
          );
          await expect
            .poll(() => track.evaluate((el) => el.scrollLeft))
            .toBeGreaterThan(0);
        }
      }
      await page.locator("summary").click();
      const search = page.getByRole("searchbox", {
        name: messages.pages.home.hero.searchLabel,
      });
      await expect(search).toBeVisible();
      await search.fill("marble");
      await search.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/catalog\\?q=marble$`),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.goto(`/${locale}`);
      await page
        .getByRole("link", {
          name: messages.pages.home.actions.projects,
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/works$`));
      await expect(page.locator("main article")).toHaveCount(5);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.locator("main article").last().scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          page
            .locator("main img")
            .evaluateAll((imgs) =>
              imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0),
            ),
        )
        .toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`works-${locale}-${width}.png`),
        fullPage: true,
      });
      const axe = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes[0]?.html}`),
      ).toEqual([]);
      await page
        .locator('main a[href$="/catalog/golden-rock"]')
        .first()
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/catalog/golden-rock$`),
      );
      await expect(page.locator("h1")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
