import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import { expect, signInInContext, test } from "./auth-fixtures";
import { SEEDED } from "./test-env";

const messages = { en, ru };

async function createProduct(page: Page) {
  const slug = `e2e-promotion-${crypto.randomUUID().slice(0, 8)}`;
  const names = { en: `Promotion ${slug}`, ru: `Акция ${slug}` };
  const f = en.admin.form;
  await page.goto("/en/admin/products/new");
  await page.getByLabel(f.nameEn, { exact: true }).fill(names.en);
  await page.getByLabel(f.nameRu, { exact: true }).fill(names.ru);
  await page.getByLabel(f.slug, { exact: true }).fill(slug);
  await page.getByLabel(f.pricePerM2, { exact: true }).fill("100");
  await page.getByRole("button", { name: f.publish }).click();
  await page.waitForURL("**/en/admin/products");
  return { slug, names };
}

for (const locale of ["en", "ru"] as const) {
  const t = messages[locale].admin.promotions;
  const f = messages[locale].admin.form;
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
    }).format(amount);

  test(`${locale}: saves independent price/badge fields, rejects stale edits and clears a promotion`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "The desktop project exercises the admin form; mobile is the narrow-screen message.",
    );
    await signInInContext(context, SEEDED.admin);
    const { slug, names } = await createProduct(page);
    const url = `/${locale}/admin/promotions?q=${slug}&product=${slug}`;
    await page.goto(url);
    const stale = await context.newPage();
    const storefront = await context.newPage();
    try {
      await stale.goto(url);
      await expect(stale.getByLabel(f.pricePerM2, { exact: true })).toHaveValue(
        "100",
      );
      await page.getByLabel(f.pricePerM2, { exact: true }).fill("80");
      await page.getByLabel(f.oldPrice, { exact: true }).fill("100");
      await page.getByLabel(f.discount, { exact: true }).fill("15");
      const preview = page.getByRole("complementary", { name: t.preview });
      await expect(preview).toContainText(money(80));
      await expect(preview).toContainText("15%");
      await page.getByRole("button", { name: t.save }).click();
      await expect(
        page.getByRole("status").filter({ hasText: t.saved }),
      ).toBeVisible();

      await storefront.goto(`/${locale}/catalog?q=${slug}&sale=1`);
      await expect(
        storefront.getByRole("link", { name: names[locale], exact: true }),
      ).toBeVisible();
      await expect(storefront.getByRole("main")).toContainText(money(80));
      await expect(storefront.locator("s")).toContainText(money(100));
      await expect(storefront.getByRole("main")).toContainText("15%");

      await stale.getByLabel(f.pricePerM2, { exact: true }).fill("70");
      await stale.getByRole("button", { name: t.save }).click();
      await expect(
        stale.getByRole("alert").filter({ hasText: t.errors.conflict }),
      ).toBeVisible();
      await expect(stale.getByLabel(f.pricePerM2, { exact: true })).toHaveValue(
        "70",
      );
      await expect(page.getByLabel(f.pricePerM2, { exact: true })).toHaveValue(
        "80",
      );
      await page.getByLabel(f.oldPrice, { exact: true }).fill("");
      await page.getByLabel(f.discount, { exact: true }).fill("");
      await page.getByRole("button", { name: t.save }).click();
      await expect(
        page.getByRole("status").filter({ hasText: t.saved }),
      ).toBeVisible();
      await storefront.reload();
      await expect(
        storefront.getByRole("link", { name: names[locale], exact: true }),
      ).toHaveCount(0);
      await storefront.goto(`/${locale}/catalog?q=${slug}`);
      await expect(
        storefront.getByRole("link", { name: names[locale], exact: true }),
      ).toBeVisible();
      await expect(storefront.getByRole("main")).toContainText(money(80));
      await expect(storefront.locator("s")).toHaveCount(0);
      await expect(storefront.getByRole("main")).not.toContainText("15%");
      await page.goto(`/${locale}/admin/products/${slug}`);
      await expect(page.getByLabel(f.pricePerM2, { exact: true })).toHaveValue(
        "80",
      );
      await expect(page.getByLabel(f.oldPrice, { exact: true })).toHaveValue(
        "",
      );
      await expect(page.getByLabel(f.discount, { exact: true })).toHaveValue(
        "",
      );
    } finally {
      await stale.close();
      await storefront.close();
    }
  });

  test(`${locale}: search has an empty state and selection follows the URL`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "The desktop project exercises search.",
    );
    await signInInContext(context, SEEDED.admin);
    await page.goto(`/${locale}/admin/promotions?q=black-marble`);
    await expect(
      page.getByRole("combobox", { name: t.product, exact: true }),
    ).toHaveValue("black-marble");
    const search = page.getByRole("searchbox", { name: t.searchLabel });
    await search.fill("nonexistent-promotion-product");
    await search.press("Enter");
    await expect(page.getByText(t.none)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: t.selectProduct }),
    ).toBeVisible();
  });

  test(`${locale}: full Product and Promotions reject each other's stale saves`, async ({
    page,
    context,
  }, info) => {
    test.skip(
      info.project.name !== "auth-desktop",
      "The desktop project exercises editing.",
    );
    await signInInContext(context, SEEDED.admin);
    const { slug } = await createProduct(page);
    const product = await context.newPage();
    try {
      await page.goto(`/${locale}/admin/promotions?product=${slug}&q=${slug}`);
      await product.goto(`/${locale}/admin/products/${slug}`);
      await page.getByLabel(f.pricePerM2, { exact: true }).fill("80");
      await page.getByRole("button", { name: t.save }).click();
      await expect(page.getByRole("status")).toHaveText(t.saved);
      await product
        .getByLabel(f.nameEn, { exact: true })
        .fill("Unsaved product name");
      await product
        .getByRole("button", { name: f.saveChanges, exact: true })
        .click();
      await expect(product.getByRole("main").getByRole("alert")).toHaveText(
        f.errors.conflict,
      );
      await expect(product.getByLabel(f.nameEn, { exact: true })).toHaveValue(
        "Unsaved product name",
      );
      await product
        .getByRole("button", { name: f.unpublish, exact: true })
        .click();
      await expect(product.getByRole("main").getByRole("alert")).toHaveText(
        f.errors.conflict,
      );
      await expect(
        product.getByRole("button", { name: f.unpublish, exact: true }),
      ).toBeEnabled();
      await product.reload();
      await product.getByLabel(f.pricePerM2, { exact: true }).fill("70");
      await product
        .getByLabel(f.descriptionEn, { exact: true })
        .fill("Confirmed description");
      await product
        .getByRole("button", { name: f.saveChanges, exact: true })
        .click();
      await product.waitForURL(`**/${locale}/admin/products`);
      await page.getByLabel(f.pricePerM2, { exact: true }).fill("60");
      await page.getByRole("button", { name: t.save }).click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        t.errors.conflict,
      );
      await expect(page.getByLabel(f.pricePerM2, { exact: true })).toHaveValue(
        "60",
      );
      await product.goto(`/${locale}/admin/products/${slug}`);
      await expect(
        product.getByLabel(f.pricePerM2, { exact: true }),
      ).toHaveValue("70");
      await expect(
        product.getByLabel(f.descriptionEn, { exact: true }),
      ).toHaveValue("Confirmed description");
    } finally {
      await product.close();
    }
  });

  for (const width of [1440, 1024, 390])
    test(`${locale}: Promotions at ${width}px is accessible and fits`, async ({
      page,
      context,
    }, testInfo) => {
      test.skip(
        (width === 390) !== (testInfo.project.name === "auth-mobile"),
        "The matching viewport project runs this check.",
      );
      await page.setViewportSize({ width, height: 1000 });
      await signInInContext(context, SEEDED.admin);
      await page.goto(`/${locale}/admin/promotions?product=grey-limestone`);
      if (width >= 1024) {
        await expect(
          page.getByRole("complementary", { name: t.preview }),
        ).toBeVisible();
        await expect(
          page.getByRole("combobox", { name: t.product, exact: true }),
        ).toHaveValue("grey-limestone");
      } else await expect(page.locator("[data-admin-narrow]")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`promotions-${locale}-${width}.png`),
        fullPage: true,
      });
    });
}
