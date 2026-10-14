import { expect, test, type Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

/*
 * Site shell e2e (Phase 3, Task 4). Runs in the `desktop` (1440) and `mobile` (390) projects.
 * The shell lives in `src/app/[locale]/(site)/layout.tsx`: header, `<main>`, footer, tab bar.
 */

const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;

/** Resolves once React attached its props to the language switch (hydration reached the island). */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const button = document.querySelector<HTMLElement>(
      "header button[aria-label^='RU / EN'], [role=dialog] button[aria-label^='RU / EN']",
    );
    const probe =
      button ??
      document.querySelector<HTMLElement>("header button[aria-haspopup]");
    if (!probe) return false;
    const key = Object.keys(probe).find((k) => k.startsWith("__reactProps$"));
    return key !== undefined;
  });
}

test.describe("site shell", () => {
  test("shell renders header, footer and tab bar at 390", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    const response = await page.goto("/ru");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    const tabBar = page.getByRole("navigation", {
      name: ru.components.tabBar.label,
    });
    await expect(tabBar).toBeVisible();

    // The bar floats 16 px above the bottom edge and pages leave 100 px under the content.
    const viewport = page.viewportSize()!;
    const box = (await tabBar.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
    const main = page.getByRole("main");
    await expect(main).toHaveCount(1);
    await expect(page.locator("[data-site-shell]")).toHaveCSS(
      "padding-bottom",
      "100px",
    );

    // Inert tabs are not links; Home and Catalog are.
    await expect(tabBar.getByRole("link", { name: "Главная" })).toHaveAttribute(
      "href",
      "/ru",
    );
    await expect(tabBar.locator("a[href]")).toHaveCount(2);
    await expect(tabBar.locator("[aria-disabled=true]")).toHaveCount(3);
  });

  for (const locale of LOCALES) {
    test(`unknown product is 404 in ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}/catalog/no-such-stone`);
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);

      const copy = MESSAGES[locale].pages.notFound;
      await expect(page.locator("h1")).toHaveText(copy.title);
      await expect(page.getByText(copy.body)).toBeVisible();
      // the 404 is rendered inside the shell, with a way back to the catalog
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(
        page.getByRole("main").getByRole("link", { name: copy.toCatalog }),
      ).toHaveAttribute("href", `/${locale}/catalog`);
    });
  }

  // The catalog page is built in a later task: until then `/ru/catalog` is the localised 404 inside
  // the shell, which still renders the language switch. This test asserts the URL only.
  test("language switch keeps path and query", async ({ page }) => {
    await page.goto("/ru/catalog?material=marble");
    await hydrated(page);

    const switchName = /^RU \/ EN/;
    const inHeader = page.getByRole("banner").getByRole("button", {
      name: switchName,
    });
    if (!(await inHeader.isVisible())) {
      // below 1280 the switch lives in the mobile menu
      await page
        .getByRole("button", { name: ru.components.nav.openMenu })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: switchName })
        .click();
    } else {
      await inHeader.click();
    }

    await expect(page).toHaveURL(/\/en\/catalog\?material=marble$/);
  });
});
