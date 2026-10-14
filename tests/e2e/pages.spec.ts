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

    // The bar floats 16 px above the bottom edge, over the footer: the FOOTER carries the 100 px of
    // bottom padding (its glass background extends under the bar), the page wrapper none.
    const viewport = page.viewportSize()!;
    const box = (await tabBar.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
    const main = page.getByRole("main");
    await expect(main).toHaveCount(1);
    await expect(page.locator("[data-site-shell]")).toHaveCSS(
      "padding-bottom",
      "0px",
    );
    await expect(page.getByRole("contentinfo")).toHaveCSS(
      "padding-bottom",
      "100px",
    );
    // no page-background band under the footer: the footer ends at the bottom of the document
    const footerBottom = await page
      .getByRole("contentinfo")
      .evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
    const docHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(Math.abs(docHeight - footerBottom)).toBeLessThanOrEqual(1);

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

/*
 * Home page e2e (Phase 3, Task 5). Runs in the `desktop` (1440) and `mobile` (390) projects.
 */
const HOME = ru.pages.home;

test.describe("home", () => {
  test("home renders three sections with Figma cards", async ({ page }) => {
    const response = await page.goto("/ru");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const catalog = page.getByRole("region", { name: HOME.sections.catalog });
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    const works = page.getByRole("region", { name: HOME.sections.works });

    // three catalog cards, each one link to its product
    await expect(catalog.getByRole("listitem")).toHaveCount(3);
    for (const slug of ["black-marble", "grey-limestone", "grey-marble"]) {
      await expect(
        catalog.locator(`a[href="/ru/catalog/${slug}"]`),
      ).toHaveCount(1);
    }

    // three promo cards with discount badges, price and old price
    await expect(promo.getByRole("listitem")).toHaveCount(3);
    await expect(promo.locator("s")).toHaveCount(3);
    await expect(promo.getByText("−20%")).toHaveCount(2);
    await expect(promo.getByText("−25%")).toHaveCount(1);
    for (const slug of ["taupe-rock", "graphite-rock", "split-limestone"]) {
      await expect(promo.locator(`a[href="/ru/catalog/${slug}"]`)).toHaveCount(
        1,
      );
    }

    // three work cards, not links
    await expect(works.getByRole("listitem")).toHaveCount(3);
    await expect(works.locator("a")).toHaveCount(0);
    for (const key of [
      "marble-kitchen-countertop",
      "natural-stone-fireplace-portal",
      "bathroom-cladding",
    ] as const) {
      await expect(
        works.getByRole("heading", { name: HOME.works[key].title }),
      ).toHaveCount(1);
    }
  });

  test("hero search submits to the catalog with q", async ({ page }) => {
    await page.goto("/ru");
    await page.getByText(HOME.hero.searchPlaceholder, { exact: true }).click();
    const field = page.getByRole("searchbox", { name: HOME.hero.searchLabel });
    await field.fill("marble");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/ru\/catalog\?q=marble$/);
  });

  test("Offers links to /catalog?sale=1 and Open catalog to /catalog", async ({
    page,
  }) => {
    await page.goto("/ru");
    await expect(
      page.getByRole("link", { name: HOME.actions.offers }),
    ).toHaveAttribute("href", "/ru/catalog?sale=1");
    await expect(
      page.getByRole("link", { name: HOME.actions.openCatalog }),
    ).toHaveAttribute("href", "/ru/catalog");
  });

  test("Projects is inert", async ({ page }) => {
    await page.goto("/ru");
    await expect(
      page.getByRole("link", { name: HOME.actions.projects }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.locator("a", { hasText: HOME.actions.projects }),
    ).toHaveCount(0);
  });

  test("placeholder price line is visible under Promo products", async ({
    page,
  }) => {
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    await expect(promo.getByText(HOME.placeholderPrices)).toBeVisible();
  });

  test("hero loads exactly one image", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (/\/images\/hero\/scene-/.test(request.url())) {
        requests.push(request.url());
      }
    });
    await page.goto("/ru", { waitUntil: "networkidle" });
    expect(requests).toHaveLength(1);
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/ru");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("carousel arrows scroll", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "arrows are hidden on phones",
    );
    // at 1024 the three cards overflow the track, so both arrows have work to do
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    const prev = promo.getByRole("button", {
      name: ru.components.carousel.prev,
    });
    const next = promo.getByRole("button", {
      name: ru.components.carousel.next,
    });
    const track = promo.getByRole("list");

    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    await next.click();
    await expect
      .poll(() => track.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    // 923 px of cards in a 774 px track: one step reaches the end
    await expect(prev).toBeEnabled();
    await expect(next).toBeDisabled();
    await prev.click();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
  });

  test("reduced motion scrolls instantly", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "arrows are hidden on phones",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    const track = promo.getByRole("list");
    await promo
      .getByRole("button", { name: ru.components.carousel.next })
      .click();
    const immediate = await track.evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(600);
    const settled = await track.evaluate((el) => el.scrollLeft);
    expect(immediate).toBeGreaterThan(0);
    expect(immediate).toBe(settled);
  });
});
