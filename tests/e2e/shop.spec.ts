import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import { createAccount, expect, signInInContext, test } from "./auth-fixtures";
import { NEW_PASSWORD, SEEDED } from "./test-env";

/*
 * Test shop: cart and test checkout (docs/superpowers/specs/2026-10-19-test-shop-cart-checkout-design.md).
 * Runs on the database server (auth-desktop 1440, auth-mobile 390). Every test uses accounts of its own, so the
 * orders it places never touch another test's data (the admin Overview total can only grow, see admin.spec.ts).
 */

const MESSAGES = { en, ru } as const;

/** React hydrated the shell (the account island wrote its state). */
async function hydrated(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-account-state",
    /^(guest|signed-in)$/,
  );
}

async function fillSignIn(page: Page, email: string) {
  await page.getByLabel(en.auth.email, { exact: true }).fill(email);
  await page.getByLabel(en.auth.password, { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: en.auth.signIn.submit }).click();
}

async function expectAccessible(page: Page, locale: "ru" | "en") {
  // The floating glass tab bar sits over scrolling content; axe cannot resolve its blur and measures what is
  // behind it (the same shell exclusion as pages.spec.ts and product.spec.ts).
  const results = await new AxeBuilder({ page })
    .exclude(`[aria-label="${MESSAGES[locale].components.tabBar.label}"]`)
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
    ),
    "axe",
  ).toEqual([]);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}

test("guest cart -> sign-in -> test order -> admin marks delivered -> customer sees it; another client gets 404", async ({
  page,
  browser,
  baseURL,
  clientIp,
}) => {
  test.slow();
  const email = await createAccount(browser, baseURL!, clientIp, NEW_PASSWORD);
  const c = en.cart;

  // Add from the product page (twice: the order area adds up), then Buy now opens the cart.
  await page.goto("/en/catalog/black-marble");
  await hydrated(page);
  const main = page.getByRole("main");
  await main.getByRole("button", { name: en.pages.product.addToCart }).click();
  await expect(main.getByRole("status")).toHaveText(
    c.added.replace("{area}", "2.20"),
  );
  await main.getByRole("button", { name: en.pages.product.buyNow }).click();
  await expect(page).toHaveURL(/\/en\/cart$/);
  const area = page.getByRole("textbox", { name: c.area });
  await expect(area).toHaveValue("4.40");
  await expect(page.getByTestId("cart-total")).toHaveText("$1,056.00");
  await expect(page.getByText(c.indicative)).toBeVisible();
  await expect(page.locator("[data-test-banner]")).toHaveText(
    en.testBanner.text,
  );

  // The cart survives a reload.
  await page.reload();
  await expect(page.getByRole("textbox", { name: c.area })).toHaveValue("4.40");

  // A Guest is sent to sign-in and comes back to the cart, items intact.
  await page.getByRole("link", { name: c.checkout }).click();
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fen%2Fcart$/);
  await fillSignIn(page, email);
  await expect(page).toHaveURL(/\/en\/cart$/);
  await expect(page.getByTestId("cart-total")).toHaveText("$1,056.00");

  // Checkout: the test notice, then the order number only after it was saved.
  await page.getByRole("link", { name: c.checkout }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
  await expect(page.getByText(en.checkout.notice)).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("$1,056.00");
  await page.getByRole("button", { name: en.checkout.place }).click();
  await expect(page).toHaveURL(/\/en\/account\/orders\/T-\d+\?placed=1$/);
  const number = /\/orders\/(T-\d+)/.exec(page.url())![1]!;
  const o = en.account.orders;
  await expect(page.getByRole("status")).toContainText(
    o.placed.replace("{number}", number),
  );
  await expect(page.getByTestId("order-total")).toHaveText("$1,056.00");
  await expect(page.getByText("4.40 m² × $240.00 / m²")).toBeVisible();
  const orderUrl = `/en/account/orders/${number}`;

  // The cart is empty now.
  await page.goto("/en/cart");
  await expect(
    page.getByRole("heading", { name: c.empty.title }),
  ).toBeVisible();

  // The account list shows it and leads to it.
  await page.goto("/en/account/orders");
  const card = page.getByRole("listitem").filter({
    has: page.getByRole("heading", {
      name: o.testOrder.replace("{number}", number),
    }),
  });
  await card.getByRole("link", { name: new RegExp(o.view) }).click();
  await expect(page).toHaveURL(new RegExp(`${orderUrl}$`));

  // The admin sees the area line and marks it delivered.
  const adminContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": clientIp },
  });
  try {
    await signInInContext(adminContext, SEEDED.admin);
    const admin = await adminContext.newPage();
    const t = en.admin.orders;
    await admin.goto(`/en/admin/orders?order=${number}`, {
      waitUntil: "networkidle",
    });
    if ((admin.viewportSize()?.width ?? 0) >= 1024) {
      const detail = admin.getByRole("complementary", {
        name: t.detail.title.replace("{number}", number),
      });
      await expect(detail.getByText("4.40 m² × $240 / m²")).toBeVisible();
      await expect(detail).toContainText(t.kind.test_checkout);
      await detail
        .getByLabel(t.detail.fulfillment, { exact: true })
        .selectOption({ label: t.status.delivered });
      await detail.getByRole("button", { name: t.detail.update }).click();
      await expect(detail.getByText(t.detail.saved)).toBeVisible({
        timeout: 10_000,
      });

      // The customer sees Delivered.
      await page.goto(orderUrl);
      await expect(
        page.getByText(o.status.delivered, { exact: true }).first(),
      ).toBeVisible();
    }
  } finally {
    await adminContext.close();
  }

  // Another client cannot open it.
  const otherEmail = await createAccount(
    browser,
    baseURL!,
    clientIp,
    NEW_PASSWORD,
  );
  const otherContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": clientIp },
  });
  try {
    await signInInContext(otherContext, {
      email: otherEmail,
      password: NEW_PASSWORD,
    });
    const other = await otherContext.newPage();
    const response = await other.goto(orderUrl);
    expect(response?.status()).toBe(404);
    await expect(other.locator("h1")).toHaveText(en.pages.notFound.title);
  } finally {
    await otherContext.close();
  }
});

for (const locale of ["ru", "en"] as const) {
  test(`${locale}: empty cart, invalid area, accessible cart, checkout and order pages`, async ({
    page,
    browser,
    baseURL,
    clientIp,
  }) => {
    test.slow();
    const m = MESSAGES[locale];
    const email = await createAccount(
      browser,
      baseURL!,
      clientIp,
      NEW_PASSWORD,
    );

    await page.goto(`/${locale}/cart`);
    await hydrated(page);
    await expect(
      page.getByRole("heading", { name: m.cart.empty.title }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: m.cart.empty.browse }),
    ).toHaveAttribute("href", `/${locale}/catalog`);
    await expectAccessible(page, locale);

    await page.goto(`/${locale}/catalog/grey-marble`);
    await hydrated(page);
    await page
      .getByRole("main")
      .getByRole("button", { name: m.pages.product.buyNow })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/cart$`));
    const area = page.getByRole("textbox", { name: m.cart.area });
    await area.fill("abc");
    await area.blur();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      m.cart.error.invalid,
    );
    await expect(page.getByRole("link", { name: m.cart.checkout })).toHaveCount(
      0,
    );
    await area.fill(locale === "ru" ? "3,5" : "3.5");
    await area.blur();
    await expect(
      page.getByRole("link", { name: m.cart.checkout }),
    ).toBeVisible();
    await expectAccessible(page, locale);

    await signInInContext(page.context(), { email, password: NEW_PASSWORD });
    await page.goto(`/${locale}/checkout`);
    await expect(page.getByText(m.checkout.notice)).toBeVisible();
    await expect(page.getByTestId("checkout-total")).not.toHaveText("—");
    await expectAccessible(page, locale);
    await page.getByRole("button", { name: m.checkout.place }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/account/orders/T-\\d+\\?placed=1$`),
    );
    await expect(page.getByRole("status")).toBeVisible();
    await expectAccessible(page, locale);
  });
}
