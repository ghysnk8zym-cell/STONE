import AxeBuilder from "@axe-core/playwright";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import {
  expect,
  signInInContext,
  signUpInContext,
  test,
} from "./auth-fixtures";
import { NEW_PASSWORD, SEEDED } from "./test-env";

const messages = { en, ru };

for (const locale of ["en", "ru"] as const) {
  const t = messages[locale].admin.customers;

  test(`${locale}: customer roles change for an existing isolated session`, async ({
    page,
    context,
    browser,
    baseURL,
    clientIp,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "Role controls are in the desktop admin shell; mobile access is covered separately.",
    );
    const customer = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": clientIp },
    });
    try {
      const email = await signUpInContext(customer, NEW_PASSWORD);
      await signInInContext(context, SEEDED.admin);
      await page.goto(
        `/${locale}/admin/customers?q=${encodeURIComponent(email)}`,
      );
      await expect(
        page.getByRole("heading", { level: 1, name: t.title }),
      ).toBeVisible();
      await expect(page.getByText(t.noOrders)).toBeVisible();
      expect((await customer.request.get(`/${locale}/admin`)).status()).toBe(
        404,
      );

      for (const [role, status] of [
        ["admin", 200],
        ["client", 404],
      ] as const) {
        await page
          .getByRole("combobox", { name: t.role, exact: true })
          .selectOption(role);
        const response = page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes("/admin/customers"),
        );
        await page.getByRole("button", { name: t.updateRole }).click();
        expect((await response).status()).toBe(200);
        await expect(
          page.getByRole("combobox", { name: t.role, exact: true }),
        ).toHaveValue(role);
        await expect(
          page.getByRole("status").filter({ hasText: t.saved }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: t.updateRole }),
        ).toBeDisabled();
        expect((await customer.request.get(`/${locale}/admin`)).status()).toBe(
          status,
        );
      }
    } finally {
      await customer.close();
    }
  });

  test(`${locale}: search, own role and customer order navigation`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "Search/details are in the desktop admin shell.",
    );
    await signInInContext(context, SEEDED.admin);
    await page.goto(
      `/${locale}/admin/customers?q=${encodeURIComponent(SEEDED.admin.email)}`,
    );
    await expect(page.getByText(t.ownRole)).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: t.role, exact: true }),
    ).toHaveCount(0);
    const search = page.getByRole("searchbox", { name: t.searchLabel });
    await search.fill("no-customer-with-this-name");
    await search.press("Enter");
    await expect(page.getByText(t.none)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: t.selectCustomer }),
    ).toBeVisible();
    await search.fill(SEEDED.client.email);
    await search.press("Enter");
    const order = page.getByRole("link", {
      name: `${t.viewOrder} D-1048`,
      exact: true,
    });
    await expect(order).toBeVisible();
    await order.click();
    await expect(
      page.getByRole("heading", {
        name: messages[locale].admin.orders.detail.title.replace(
          "{number}",
          "D-1048",
        ),
      }),
    ).toBeVisible();
  });

  for (const width of [1440, 1024, 390]) {
    test(`${locale}: Customers at ${width}px is accessible and fits the viewport`, async ({
      page,
      context,
    }, testInfo) => {
      // Each width runs once; the mobile project owns the narrow-layout check.
      test.skip(
        (width === 390) !== (testInfo.project.name === "auth-mobile"),
        "The matching viewport project runs this check.",
      );
      await page.setViewportSize({ width, height: 1000 });
      await signInInContext(context, SEEDED.admin);
      await page.goto(`/${locale}/admin/customers?q=STONE`);
      if (width >= 1024) {
        const list = page.getByRole("region", { name: t.title, exact: true });
        await list
          .getByRole("link")
          .filter({ hasText: SEEDED.client.email })
          .click();
        await expect(
          page.getByRole("link", {
            name: `${t.viewOrder} D-1048`,
            exact: true,
          }),
        ).toBeVisible();
      } else {
        await expect(page.locator("[data-admin-narrow]")).toBeVisible();
        await expect(page.locator("[data-admin-shell]")).not.toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`customers-${locale}-${width}.png`),
        fullPage: true,
      });
    });
  }
}
