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

  test("Buy now and Add to cart are live buttons (test shop); Save is a live toggle", async ({
    page,
  }) => {
    await page.goto("/en/catalog/black-marble");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("button", { name: PRODUCT.save }),
    ).toHaveAttribute("aria-pressed", "false");
    for (const label of [PRODUCT.buyNow, PRODUCT.addToCart]) {
      const button = main.getByRole("button", { name: label });
      await expect(button).toBeEnabled();
      await expect(button).not.toHaveAttribute("aria-disabled", "true");
    }
    // Without a database the cart still works: it is priced from the static catalog.
    await productReady(page);
    await main.getByRole("button", { name: PRODUCT.buyNow }).click();
    await expect(page).toHaveURL(/\/en\/cart$/);
    await expect(page.getByTestId("cart-total")).toHaveText("$528.00");
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

  // Maximum valid order: 9 090.91 m² net plus rounded allowance = 10 000 m².
  async function maxTotal(page: Page) {
    await page.goto("/ru/catalog/black-marble");
    await productReady(page, "ru");
    await page
      .getByLabel(PRODUCT_RU.calculator.fields.area, { exact: true })
      .fill("9 090,91");
    const total = page.getByTestId("calculator-total");
    await expect(total).toHaveText(/^2\s400\s000,00\s\$$/);
    return total.evaluate((el) => {
      const card = el.closest("section")!.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return {
        insideLeft: box.left - card.left,
        insideRight: card.right - box.right,
        clipped: el.scrollWidth - el.clientWidth,
        fontSize: getComputedStyle(el).fontSize,
      };
    });
  }

  test("the largest total stays inside the calculator at 320", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const total = await maxTotal(page);
    expect(total.insideLeft).toBeGreaterThanOrEqual(0);
    expect(total.insideRight).toBeGreaterThanOrEqual(0);
    expect(total.clipped).toBeLessThanOrEqual(0);
  });

  test("the total uses the responsive size at the project width", async ({
    page,
  }) => {
    const total = await maxTotal(page);
    const compactDesktop = page.viewportSize()!.width >= 1024;
    expect(total.fontSize).toBe(compactDesktop ? "32px" : "40px");
    expect(total.insideRight).toBeGreaterThanOrEqual(0);
  });

  for (const locale of LOCALES) {
    test(
      "order area boundary includes allowance (" + locale + ")",
      async ({ page }) => {
        const copy = MESSAGES[locale].pages.product;
        await page.goto("/" + locale + "/catalog/black-marble");
        await productReady(page, locale);
        const area = page.getByLabel(copy.calculator.fields.area, {
          exact: true,
        });
        await area.fill(locale === "ru" ? "9 090,91" : "9090.91");
        await expect(
          page.getByRole("button", { name: copy.addToCart, exact: true }),
        ).toBeEnabled();
        await expect(page.getByTestId("calculator-total")).toHaveText(
          locale === "ru" ? /^2\s400\s000,00\s\$$/ : "$2,400,000.00",
        );
        await area.fill(locale === "ru" ? "9 090,92" : "9090.92");
        await area.blur();
        await expect(
          page.getByText(
            copy.calculator.error.capacity.replace(
              "{max}",
              new Intl.NumberFormat(locale).format(10000),
            ),
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: copy.addToCart, exact: true }),
        ).toBeDisabled();
        await expect(
          page.getByRole("button", { name: copy.buyNow, exact: true }),
        ).toBeDisabled();
        await expect(page.getByTestId("calculator-total")).toHaveText("—");
      },
    );
  }

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

test.describe("product spacing (Figma 782:11639, 782:11727)", () => {
  for (const [width, gap] of [
    [768, 32],
    [390, 24],
  ] as const) {
    test(`thumbnails to title gap is ${gap} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en/catalog/black-marble");
      const thumb = await page
        .getByRole("button", { name: PRODUCT.gallery.detail })
        .boundingBox();
      // the title row (the heading's parent) starts the info block
      const title = await page
        .getByRole("heading", { level: 1 })
        .locator("..")
        .boundingBox();
      expect(Math.round(title!.y - (thumb!.y + thumb!.height))).toBe(gap);
    });
  }
});
