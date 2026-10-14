import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

/*
 * Product page e2e (Phase 3, Task 7). Runs in the `desktop` (1440) and `mobile` (390) projects.
 */
const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;
const PRODUCT = en.pages.product;
const PRODUCT_RU = ru.pages.product;

/** Resolves once React attached its props to the calculator (hydration reached the island). */
async function productReady(page: Page, locale: "ru" | "en" = "en") {
  const label = MESSAGES[locale].pages.product.calculator.modes.wall;
  await page.waitForFunction((text) => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === text,
    );
    return (
      button !== undefined &&
      Object.keys(button).some((k) => k.startsWith("__reactProps$"))
    );
  }, label);
}

test.describe("product", () => {
  test("renders name, specs, calculator and a back link", async ({ page }) => {
    const response = await page.goto("/en/catalog/black-marble");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Black Marble",
    );
    await expect(page).toHaveTitle("Black Marble — STONE");
    const specs = page.locator("dl").first();
    await expect(specs).toContainText("600×300×20 mm");
    await expect(specs).toContainText("Polished");
    await expect(
      page.getByRole("link", { name: PRODUCT.back }),
    ).toHaveAttribute("href", "/en/catalog");
  });

  test("Buy now, Add to cart and Save are inert", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    const main = page.getByRole("main");
    for (const label of [PRODUCT.buyNow, PRODUCT.addToCart, PRODUCT.save]) {
      await expect(main.getByRole("button", { name: label })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await expect(main.locator("a", { hasText: label })).toHaveCount(0);
    }
  });

  test("typing 2,5 in ru shows 660,00 $", async ({ page }) => {
    await page.goto("/ru/catalog/black-marble");
    await productReady(page, "ru");
    await page
      .getByLabel(PRODUCT_RU.calculator.fields.area, { exact: true })
      .fill("2,5");
    await expect(page.getByTestId("calculator-total")).toHaveText(
      /^660,00\s\$$/,
    );
  });

  test("ru defaults are locale-formatted", async ({ page }) => {
    await page.goto("/ru/catalog/black-marble");
    await productReady(page, "ru");
    await expect(
      page.getByLabel(PRODUCT_RU.calculator.fields.area, { exact: true }),
    ).toHaveValue("2,00");
    await expect(page.getByTestId("calculator-total")).toHaveText(
      /^528,00\s\$$/,
    );
  });

  test("clearing the area shows an error and a dash", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    await productReady(page);
    const field = page.getByLabel(PRODUCT.calculator.fields.area, {
      exact: true,
    });
    await field.fill("");
    await field.blur();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      PRODUCT.calculator.error.invalid,
    );
    await expect(page.getByTestId("calculator-total")).toHaveText("—");
    await field.fill("3");
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await expect(page.getByTestId("calculator-total")).toHaveText("$792.00");
  });

  test("wall mode computes length × height", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    await productReady(page);
    await page
      .getByRole("button", { name: PRODUCT.calculator.modes.wall })
      .click();
    await page
      .getByLabel(PRODUCT.calculator.fields.length, { exact: true })
      .fill("4");
    await page
      .getByLabel(PRODUCT.calculator.fields.height, { exact: true })
      .fill("2.5");
    await expect(page.getByTestId("calculator-total")).toHaveText("$2,640.00");
    await expect(page.getByTestId("calculator-result")).toContainText(
      "10.00 m²",
    );
  });

  test("thumbnail click changes the main image", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    await productReady(page);
    const main = page.locator("[data-gallery-main]");
    await expect(main).toHaveAttribute("data-view", "full");
    await page.getByRole("button", { name: PRODUCT.gallery.detail }).click();
    await expect(main).toHaveAttribute("data-view", "detail");
    await expect(
      page.getByRole("button", { name: PRODUCT.gallery.detail }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("breadcrumb material link filters the catalog", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    const crumbs = page.getByRole("navigation", {
      name: en.components.breadcrumb.label,
    });
    await crumbs.getByRole("link", { name: "Marble" }).click();
    await expect(page).toHaveURL(/\/en\/catalog\?material=marble$/);
    await expect(page.getByRole("article")).toHaveCount(2);
  });

  test("other products render with their own price", async ({ page }) => {
    for (const slug of ["charcoal-ledger", "concrete-paver", "taupe-rock"]) {
      const response = await page.goto(`/en/catalog/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId("calculator-total")).not.toHaveText("—");
      await expect(page.getByTestId("calculator-total")).not.toHaveText(
        "$528.00",
      );
    }
  });

  test("no horizontal overflow at 360 in ru", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/ru/catalog/black-marble");
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);
    await productReady(page, "ru");
    await page
      .getByRole("button", { name: PRODUCT_RU.calculator.modes.wall })
      .click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  for (const locale of LOCALES) {
    test(`axe has no critical or serious violations on a product (${locale})`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/catalog/black-marble`);
      await productReady(page, locale);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude(`[aria-label="${MESSAGES[locale].components.tabBar.label}"]`)
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
    });
  }
});

test.describe("product without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("calculator default is server-rendered", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    await expect(page.getByTestId("calculator-total")).toHaveText("$528.00");
    await expect(page.getByTestId("calculator-result")).toContainText(
      "2.20 m²",
    );
  });
});
