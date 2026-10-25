import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import { PNG } from "pngjs";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import { expect, signInInContext, test } from "./auth-fixtures";
import { ORDERS_CLIENT, SEEDED } from "./test-env";

/*
 * The admin area (Phase 4a Task 5). Runs in the `auth-desktop` (1440) and `auth-mobile` (390) projects against the e2e
 * server WITH a database (a throwaway PGlite seeded from .env.test.example). The admin screens exist from 1024 px, so the
 * flows run in the desktop project only; the mobile project runs the access checks and the "from 1024 px" message.
 * Tests that change data create a product of their own (a unique slug) or use order D-9001 of the second Client
 * (scripts/e2e-extra-seed.mjs); the seeded catalog and demo orders are only read. Every test has its own client IP.
 */

const a = en.admin;

function tag(): string {
  return Math.random().toString(36).slice(2, 8);
}

async function newProduct(
  page: Page,
  locale: "ru" | "en",
  fields: { en: string; ru: string; price: string; slug?: string },
) {
  const t = (locale === "ru" ? ru : en).admin.form;
  await page.goto(`/${locale}/admin/products/new`);
  // the form is a client component: wait for it before typing
  await expect(page.getByLabel(t.nameEn, { exact: true })).toBeVisible();
  await page.getByLabel(t.nameRu, { exact: true }).fill(fields.ru);
  await page.getByLabel(t.nameEn, { exact: true }).fill(fields.en);
  if (fields.slug) {
    await page.getByLabel(t.slug, { exact: true }).fill(fields.slug);
  }
  await page.getByLabel(t.descriptionRu, { exact: true }).fill("Описание.");
  await page.getByLabel(t.descriptionEn, { exact: true }).fill("Description.");
  await page.getByLabel(t.pricePerM2, { exact: true }).fill(fields.price);
}

test.describe("access", () => {
  test("a Guest is sent to sign-in with the page as next, in both languages", async ({
    page,
  }) => {
    for (const path of ["/ru/admin", "/en/admin/products"]) {
      await page.goto(path);
      await page.waitForURL(/\/sign-in\?next=/);
      expect(new URL(page.url()).pathname).toBe(
        `/${path.split("/")[1]}/sign-in`,
      );
      expect(new URL(page.url()).searchParams.get("next")).toBe(path);
    }
  });

  test("a Client gets a 404 on every admin page, in both languages", async ({
    page,
    context,
  }) => {
    await signInInContext(context, SEEDED.client);
    for (const path of [
      "/en/admin",
      "/ru/admin",
      "/en/admin/products",
      "/en/admin/products/new",
      "/en/admin/orders",
      "/ru/admin/customers",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      // nothing of the admin area is revealed
      await expect(
        page.getByRole("navigation", { name: a.nav.label }),
      ).toHaveCount(0);
    }
  });

  test("below 1024 px a message replaces the admin shell; at 1024 the shell is there", async ({
    page,
    context,
  }) => {
    await signInInContext(context, SEEDED.admin);
    for (const locale of ["en", "ru"] as const) {
      const t = { en, ru }[locale].admin;
      await page.setViewportSize({ width: 1023, height: 800 });
      await page.goto(`/${locale}/admin`);
      await expect(
        page.getByRole("heading", { level: 1, name: t.narrow.title }),
      ).toBeVisible();
      await expect(page.getByText(t.narrow.body)).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: t.nav.label }),
      ).toBeHidden();

      await page.setViewportSize({ width: 1024, height: 800 });
      await expect(
        page.getByRole("navigation", { name: t.nav.label }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 1, name: t.overview.title }),
      ).toBeVisible();
      await expect(page.getByText(t.narrow.body)).toBeHidden();
    }
  });
});

test.describe("admin screens", () => {
  test.beforeEach(async ({ context }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "the admin layouts start at 1024 px; the flows run in the desktop project",
    );
    await signInInContext(context, SEEDED.admin);
  });

  test("the sidebar links all eight sections and every one is a real page", async ({
    page,
  }) => {
    await page.goto("/en/admin");
    const nav = page.getByRole("navigation", { name: a.nav.label });
    for (const [key, heading] of [
      ["orders", a.orders.title],
      ["products", a.products.title],
      ["createYourStone", a.createYourStone.title],
      ["customers", a.customers.title],
      ["promotions", a.promotions.title],
      ["siteContent", a.siteContent.title],
      ["overview", a.overview.title],
    ] as const) {
      await nav.getByRole("link", { name: a.nav[key], exact: true }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(
        nav.getByRole("link", { name: a.nav[key], exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
    await expect(
      nav.getByRole("link", { name: a.nav.signOut }),
    ).toHaveAttribute("href", "/en/sign-out");
  });

  test("sidebar language switch keeps the admin page, filters and keyboard access", async ({
    page,
  }) => {
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/ru/admin/products?q=marble&status=published");
      const nav = page.getByRole("navigation", { name: ru.admin.nav.label });
      const language = nav.getByRole("button", { name: /^RU \/ EN/ });
      const exit = nav.getByRole("link", {
        name: ru.admin.nav.signOut,
        exact: true,
      });
      await expect(language.locator('[lang="ru"]')).toHaveCSS(
        "text-decoration-line",
        "underline",
      );
      const box = (await language.boundingBox())!;
      const exitBox = (await exit.boundingBox())!;
      expect(box.height).toBe(46);
      expect(box.y + box.height).toBeLessThanOrEqual(exitBox.y);
      await nav
        .getByRole("link", { name: ru.admin.nav.siteContent, exact: true })
        .focus();
      await page.keyboard.press("Tab");
      await expect(language).toBeFocused();
      await expect(language).toHaveCSS("outline-width", "2px");
      await page.keyboard.press("Enter");
      await page.waitForURL((url) => url.pathname === "/en/admin/products");
      expect(new URL(page.url()).searchParams.get("q")).toBe("marble");
      expect(new URL(page.url()).searchParams.get("status")).toBe("published");
      const englishNav = page.getByRole("navigation", {
        name: en.admin.nav.label,
      });
      const englishLanguage = englishNav.getByRole("button", {
        name: /^RU \/ EN/,
      });
      await expect(englishLanguage.locator('[lang="en"]')).toHaveCSS(
        "text-decoration-line",
        "underline",
      );
      await expect(
        englishNav.getByRole("link", {
          name: en.admin.nav.signOut,
          exact: true,
        }),
      ).toHaveAttribute("href", "/en/sign-out");
      await englishLanguage.click();
      await page.waitForURL((url) => url.pathname === "/ru/admin/products");
      expect(new URL(page.url()).searchParams.get("q")).toBe("marble");
      expect(new URL(page.url()).searchParams.get("status")).toBe("published");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/ru/admin/products/black-marble");
    await page
      .getByRole("navigation", { name: ru.admin.nav.label })
      .getByRole("button", { name: /^RU \/ EN/ })
      .click();
    await page.waitForURL(
      (url) => url.pathname === "/en/admin/products/black-marble",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: en.admin.products.edit }),
    ).toBeVisible();
  });

  test("the request section renders its working list in both languages", async ({
    page,
  }) => {
    for (const locale of ["en", "ru"] as const) {
      const t = { en, ru }[locale].admin;
      for (const section of ["create-your-stone"]) {
        const response = await page.goto(`/${locale}/admin/${section}`);
        expect(response?.status()).toBe(200);
        await expect(
          page.getByRole("heading", {
            name: t.createYourStone.requests,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  test("the Overview shows figures from the database", async ({ page }) => {
    await page.goto("/en/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: a.overview.title }),
    ).toBeVisible();
    // The demo orders: $240 + $384 and the e2e Client's $480 (D-9001) = $1,104. Test checkout orders placed by
    // tests/e2e/shop.spec.ts on the same database (in parallel) can only add to it.
    const sales = page.getByRole("region", {
      name: a.overview.kpi.sales,
      exact: true,
    });
    await expect(sales).toContainText(a.overview.kpi.orders);
    const revenue = /\$([\d,]+)/.exec((await sales.textContent()) ?? "");
    expect(Number(revenue?.[1]?.replaceAll(",", ""))).toBeGreaterThanOrEqual(
      1104,
    );
    await expect(
      page.getByRole("link", { name: a.overview.products.view }),
    ).toHaveAttribute("href", "/en/admin/products");
    await expect(
      page.getByRole("link", { name: a.overview.addProduct }),
    ).toHaveAttribute("href", "/en/admin/products/new");
  });

  test("the product list searches and filters through the URL", async ({
    page,
  }) => {
    await page.goto("/en/admin/products?q=marble");
    const list = page.getByRole("listitem").filter({
      has: page.getByRole("link", { name: new RegExp(a.products.edit) }),
    });
    await expect(list).toHaveCount(2);
    await expect(page.getByText("Black Marble").first()).toBeVisible();
    await expect(page.getByText("Charcoal Ledger")).toHaveCount(0);

    await page.goto("/en/admin/products?status=draft&q=zzzz");
    await expect(
      page.getByRole("heading", { name: a.products.noneFound.title }),
    ).toBeVisible();
  });

  test("an admin adds a product: it is in the catalog, its page is 200, and an edit of the ru name shows", async ({
    page,
    context,
  }) => {
    const id = tag();
    const names = { en: `E2E Stone ${id}`, ru: `Тест камень ${id}` };
    const slug = `e2e-stone-${id}`;

    await newProduct(page, "en", { ...names, price: "99.50" });
    // the slug follows the English name until it is typed
    await expect(page.getByLabel(a.form.slug, { exact: true })).toHaveValue(
      slug,
    );
    await expect(page.getByTestId("storefront-preview")).toContainText(
      "$99.50",
    );
    await page.getByRole("button", { name: a.form.publish }).click();
    await page.waitForURL("**/en/admin/products");
    await expect(page.getByText(names.en).first()).toBeVisible();

    // visible in the public catalog (ru) and its page is 200
    const response = await context.request.get(`/ru/catalog/${slug}`);
    expect(response.status()).toBe(200);
    await page.goto(`/ru/catalog?q=${encodeURIComponent(names.ru)}`);
    await expect(
      page.getByRole("link", { name: new RegExp(names.ru) }),
    ).toBeVisible();
    await page.goto(`/ru/catalog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(names.ru);
    await page.goto(`/en/catalog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(names.en);

    // edit the ru name: the catalog and the page show it
    const renamed = `Новое имя ${id}`;
    await page.goto(`/en/admin/products/${slug}`);
    await expect(page.getByLabel(a.form.nameRu, { exact: true })).toHaveValue(
      names.ru,
    );
    await page.getByLabel(a.form.nameRu, { exact: true }).fill(renamed);
    await page.getByRole("button", { name: a.form.saveChanges }).click();
    await page.waitForURL("**/en/admin/products");

    await page.goto(`/ru/catalog?q=${encodeURIComponent(renamed)}`);
    await expect(
      page.getByRole("link", { name: new RegExp(renamed) }),
    ).toBeVisible();
    await page.goto(`/ru/catalog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
    // the old name is gone from the catalog
    await page.goto(`/ru/catalog?q=${encodeURIComponent(names.ru)}`);
    await expect(
      page.getByRole("link", { name: new RegExp(names.ru) }),
    ).toHaveCount(0);
  });

  test("an admin unpublishes a product: its page is a 404 and it is gone from the grid; publishing brings it back", async ({
    page,
    context,
  }) => {
    const id = tag();
    const name = `E2E Hidden ${id}`;
    const slug = `e2e-hidden-${id}`;
    await newProduct(page, "en", {
      en: name,
      ru: `Скрытый ${id}`,
      price: "50",
    });
    await page.getByRole("button", { name: a.form.publish }).click();
    await page.waitForURL("**/en/admin/products");
    expect((await context.request.get(`/en/catalog/${slug}`)).status()).toBe(
      200,
    );

    await page.goto(`/en/admin/products/${slug}`);
    await expect(page.getByLabel(a.form.nameEn, { exact: true })).toHaveValue(
      name,
    );
    await page.getByRole("button", { name: a.form.unpublish }).click();
    await page.waitForURL("**/en/admin/products");

    expect((await context.request.get(`/en/catalog/${slug}`)).status()).toBe(
      404,
    );
    await page.goto(`/en/catalog?q=${encodeURIComponent(name)}`);
    await expect(
      page.getByRole("link", { name: new RegExp(name) }),
    ).toHaveCount(0);
    // still in the admin list, as a draft
    await page.goto(`/en/admin/products?status=draft&q=${id}`);
    await expect(page.getByText(name).first()).toBeVisible();

    await page
      .getByRole("link", { name: new RegExp(a.products.editDraft) })
      .click();
    await page.getByRole("button", { name: a.form.publish }).click();
    await page.waitForURL("**/en/admin/products");
    expect((await context.request.get(`/en/catalog/${slug}`)).status()).toBe(
      200,
    );
  });

  test("the home page follows an admin: a renamed featured product shows its new name, an unpublished one disappears", async ({
    page,
    context,
  }) => {
    // Split Limestone is in the home "promo" carousel and no other e2e test reads it.
    const slug = "split-limestone";
    const original = ru.catalog.products[slug].name;
    const id = tag();
    const renamed = `Переименован ${id}`;
    // The client messages of every page carry all product names, so look at the card itself: the
    // product's card in the server HTML of the home page (null when the card is not there).
    const card = async () => {
      const html = await (await context.request.get("/ru")).text();
      // the card is an <article> with an overlay link; take the article that holds the link
      const match = new RegExp(
        `<article(?:(?!</article>)[\\s\\S])*?href="/ru/catalog/${slug}"(?:(?!</article>)[\\s\\S])*?</article>`,
      ).exec(html);
      return match ? match[0].replace(/<[^>]+>/g, " ") : null;
    };
    const edit = async (button: string | RegExp, name?: string) => {
      // The buttons are client-side handlers: an early click (before hydration) does nothing and
      // hydration can overwrite a typed value, so retry the whole fill + click until it lands.
      await expect(async () => {
        await page.goto(`/en/admin/products/${slug}`, {
          waitUntil: "networkidle",
        });
        await expect(
          page.getByLabel(a.form.nameRu, { exact: true }),
        ).toHaveValue(/.+/);
        if (name !== undefined) {
          await page.getByLabel(a.form.nameRu, { exact: true }).fill(name);
        }
        await page.getByRole("button", { name: button }).click();
        await page.waitForURL("**/en/admin/products", { timeout: 5_000 });
      }).toPass({ timeout: 30_000 });
    };

    try {
      // Read before the mutation, then require each subsequent request to reflect it.
      expect(await card()).toContain(original);

      await edit(a.form.saveChanges, renamed);
      const afterRename = await card();
      expect(afterRename).toContain(renamed);
      expect(afterRename).not.toContain(original);

      await edit(a.form.unpublish);
      expect(await card()).toBeNull();
      expect((await context.request.get(`/ru/catalog/${slug}`)).status()).toBe(
        404,
      );
    } finally {
      // leave the seeded product as it was (published, original name)
      await edit(
        new RegExp(`^(${a.form.publish}|${a.form.saveChanges})$`),
        original,
      );
    }
    expect(await card()).toContain(original);
  });

  test("a product page that was a 404 becomes 200 once the product is created; wrong-case and unknown slugs cache nothing", async ({
    page,
    context,
  }) => {
    const id = tag();
    const slug = `e2e-late-${id}`;
    const request = context.request;

    // wrong case: a redirect to the lowercase page, which is a normal 200
    const redirect = await request.get("/ru/catalog/Black-Marble", {
      maxRedirects: 0,
    });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers()["location"]).toBe("/ru/catalog/black-marble");
    // a slug that does not exist yet: 404, twice
    for (let i = 0; i < 2; i += 1) {
      expect((await request.get(`/ru/catalog/${slug}`)).status()).toBe(404);
      expect(
        (
          await request.get(`/ru/catalog/${slug.toUpperCase()}`, {
            maxRedirects: 0,
          })
        ).status(),
      ).toBe(308);
    }
    expect((await request.get("/ru/catalog/black-marble")).status()).toBe(200);

    // the admin creates it with exactly that slug: the earlier 404 must not stick
    await newProduct(page, "en", {
      en: `Late ${id}`,
      ru: `Поздний ${id}`,
      price: "10",
      slug,
    });
    await page.getByRole("button", { name: a.form.publish }).click();
    await page.waitForURL("**/en/admin/products");
    expect((await request.get(`/ru/catalog/${slug}`)).status()).toBe(200);
    expect((await request.get("/ru/catalog/black-marble")).status()).toBe(200);
  });

  test("the form says what is wrong and creates nothing", async ({ page }) => {
    const id = tag();
    await newProduct(page, "en", {
      en: `Bad ${id}`,
      ru: `Плохой ${id}`,
      price: "abc",
    });
    await page.getByRole("button", { name: a.form.publish }).click();
    await expect(
      page.getByLabel(a.form.pricePerM2, { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(a.form.errors.number).first()).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: a.form.errors.summary }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/en/admin/products/new");

    // a taken slug is reported on the slug field
    await page.getByLabel(a.form.pricePerM2, { exact: true }).fill("10");
    await page.getByLabel(a.form.slug, { exact: true }).fill("black-marble");
    await page.getByRole("button", { name: a.form.publish }).click();
    await expect(page.getByText(a.form.errors.slugTaken)).toBeVisible();
    await page.goto(`/en/admin/products?q=${id}`);
    await expect(page.getByText(`Bad ${id}`)).toHaveCount(0);
  });

  test("an order status change is visible in the Client's Orders", async ({
    page,
    browser,
    baseURL,
    clientIp,
  }) => {
    const t = en.admin.orders;
    const orders = en.account.orders;
    const clientContext: BrowserContext = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": clientIp },
    });
    const clientPage = await clientContext.newPage();
    async function clientSees(status: string) {
      await clientPage.goto("/en/account/orders");
      const card = clientPage.getByRole("listitem").filter({
        has: clientPage.getByRole("heading", {
          name: orders.demoOrder.replace("{number}", "D-9001"),
        }),
      });
      await expect(
        card.getByText(status, { exact: true }).locator("visible=true"),
      ).toBeVisible();
    }
    async function adminSets(label: string) {
      // A single mutation must retain feedback and focus after the server refresh,
      // even when it removes the selected order from the current status filter.
      const before = label === t.status.delivered ? "in_progress" : "delivered";
      await page.goto(`/en/admin/orders?order=D-9001&status=${before}`, {
        waitUntil: "networkidle",
      });
      const detail = page.getByRole("complementary", {
        name: t.detail.title.replace("{number}", "D-9001"),
      });
      await expect(
        detail.getByRole("button", { name: t.detail.update }),
      ).toBeVisible();
      await detail
        .getByLabel(t.detail.fulfillment, { exact: true })
        .selectOption({ label });
      const update = detail.getByRole("button", { name: t.detail.update });
      await update.focus();
      const answered = page.waitForResponse(
        (response) => response.request().method() === "POST",
      );
      await update.press("Enter");
      await answered;
      await page.waitForLoadState("networkidle");
      await expect(detail.getByText(t.detail.saved)).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        detail.getByText(label, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText(t.selectionOutside, { exact: true }),
      ).toBeVisible();
      await expect(update).toBeFocused();
      await expect(detail.getByText(t.detail.saved)).toBeVisible();
    }

    try {
      await signInInContext(clientContext, ORDERS_CLIENT);
      await clientSees(orders.status.in_progress);
      await adminSets(t.status.delivered);
      await clientSees(orders.status.delivered);
    } finally {
      await adminSets(t.status.in_progress);
      await clientSees(orders.status.in_progress);
      await clientContext.close();
    }
  });

  test("the order list searches by customer and shows the order detail", async ({
    page,
  }) => {
    const t = en.admin.orders;
    await page.goto("/en/admin/orders?q=D-1048");
    await expect(page.getByText("1 order", { exact: true })).toBeVisible();
    const detail = page.getByRole("complementary", {
      name: t.detail.title.replace("{number}", "D-1048"),
    });
    await expect(detail).toBeVisible();
    await expect(
      detail.getByRole("link", { name: new RegExp(t.detail.contact) }),
    ).toHaveAttribute("href", `mailto:${SEEDED.client.email}`);
    await page.goto("/en/admin/orders?status=delivered");
    await expect(page.getByRole("link", { name: /D-1032/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /D-1048/ })).toHaveCount(0);
  });

  test("the Russian admin is translated", async ({ page }) => {
    await page.goto("/ru/admin/products");
    await expect(
      page.getByRole("heading", { level: 1, name: ru.admin.products.title }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: ru.admin.products.add }),
    ).toBeVisible();
    await page.goto("/ru/admin/orders");
    await expect(
      page.getByRole("heading", { level: 1, name: ru.admin.orders.title }),
    ).toBeVisible();
  });

  for (const path of [
    "/en/admin",
    "/ru/admin",
    "/en/admin/products",
    "/en/admin/products/new",
    "/en/admin/products/black-marble",
    "/en/admin/orders",
    "/ru/admin/orders",
    "/en/admin/customers",
  ]) {
    test(`axe finds no violations on ${path} at 1440`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
      // the client forms and the chart are hydrated / painted
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    });
  }
});

test.describe("product photos", () => {
  test.beforeEach(async ({ context }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "Admin editing starts at 1024 px",
    );
    await signInInContext(context, SEEDED.admin);
  });
  for (const locale of ["ru", "en"] as const) {
    test(
      locale +
        ": uploaded gallery survives save, supports main/reorder/removal and public mobile viewing",
      async ({ page, browser }, testInfo) => {
        const t = (locale === "ru" ? ru : en).admin.form;
        const name = "Photo Stone " + tag();
        await newProduct(page, locale, {
          en: name,
          ru: "Камень " + name,
          price: "125",
        });
        const slug = await page
          .getByLabel(t.slug, { exact: true })
          .inputValue();
        const guest = await browser.newContext({
          baseURL: testInfo.project.use.baseURL,
          viewport: { width: 1440, height: 900 },
        });
        try {
          await page
            .getByRole("button", {
              name: t.upload.removeLabel.replace("{number}", "1"),
              exact: true,
            })
            .click();
          const files = [
            "tests/visual/figma/product-card-default-390.png",
            "public/images/catalog/grey-marble-390.webp",
          ];
          await page
            .getByLabel(t.upload.choose, { exact: true })
            .setInputFiles(files);
          await expect(
            page.getByRole("status").filter({ hasText: t.upload.ready }),
          ).toBeVisible();
          const list = page.getByRole("list", { name: t.upload.list });
          await expect(list.getByRole("listitem")).toHaveCount(2);
          const first = await list
            .getByRole("listitem")
            .nth(0)
            .locator("img")
            .getAttribute("src");
          const second = await list
            .getByRole("listitem")
            .nth(1)
            .locator("img")
            .getAttribute("src");
          expect(first).toContain("/api/product-images/");
          expect((await guest.request.get(first!)).status()).toBe(404);
          await page
            .getByRole("button", { name: t.upload.makeMain, exact: true })
            .click();
          await expect(
            list.getByRole("listitem").first().locator("img"),
          ).toHaveAttribute("src", second!);
          await page
            .getByRole("button", { name: t.saveDraft, exact: true })
            .click();
          await page.waitForURL(new RegExp("/" + locale + "/admin/products$"));
          await page.goto("/" + locale + "/admin/products/" + slug);
          await expect(
            page
              .getByRole("list", { name: t.upload.list })
              .getByRole("listitem"),
          ).toHaveCount(2);
          await page.reload();
          await expect(
            page
              .getByRole("list", { name: t.upload.list })
              .getByRole("listitem")
              .first()
              .locator("img"),
          ).toHaveAttribute("src", second!);
          await page
            .getByRole("button", { name: t.publish, exact: true })
            .click();
          await page.waitForURL(new RegExp("/" + locale + "/admin/products$"));
          const publicPage = await guest.newPage();
          await publicPage.goto("/" + locale + "/catalog/" + slug);
          await expect(
            publicPage.locator("[data-gallery-main] img"),
          ).toHaveAttribute("src", second!);
          const thumbs = publicPage
            .getByRole("group", {
              name: (locale === "ru" ? ru : en).pages.product.gallery.label,
            })
            .getByRole("button");
          await expect(thumbs).toHaveCount(2);
          await thumbs.nth(1).focus();
          await publicPage.keyboard.press("Enter");
          await expect(
            publicPage.locator("[data-gallery-main] img"),
          ).toHaveAttribute("src", first!);
          await publicPage.screenshot({
            path: "../qa/product-photos-" + locale + "-desktop.png",
            fullPage: true,
          });
          await publicPage.setViewportSize({ width: 390, height: 844 });
          await expect(
            publicPage.locator("[data-gallery-main] img"),
          ).toBeVisible();
          expect(
            await publicPage.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await thumbs.nth(0).click();
          await expect(
            publicPage.locator("[data-gallery-main] img"),
          ).toHaveAttribute("src", second!);
          await publicPage.screenshot({
            path: "../qa/product-photos-" + locale + "-mobile.png",
            fullPage: true,
          });
          await page.goto("/" + locale + "/admin/products/" + slug);
          await page
            .getByRole("button", {
              name: t.upload.earlier.replace("{number}", "2"),
              exact: true,
            })
            .click();
          await expect(
            page
              .getByRole("list", { name: t.upload.list })
              .getByRole("listitem")
              .first()
              .locator("img"),
          ).toHaveAttribute("src", first!);
          await page
            .getByRole("button", {
              name: t.upload.removeLabel.replace("{number}", "2"),
              exact: true,
            })
            .click();
          await page.screenshot({
            path: "../qa/product-photos-" + locale + "-admin.png",
            fullPage: true,
          });
          await page
            .getByRole("button", { name: t.saveChanges, exact: true })
            .click();
          await page.waitForURL(new RegExp("/" + locale + "/admin/products$"));
          expect((await guest.request.get(second!)).status()).toBe(404);
          expect((await guest.request.get(first!)).status()).toBe(200);
        } finally {
          await guest.close();
        }
      },
    );
  }
  test("invalid files, empty gallery and failed uploads preserve the form", async ({
    page,
  }) => {
    const t = en.admin.form;
    await newProduct(page, "en", {
      en: "Invalid Photo " + tag(),
      ru: "Проверка",
      price: "125",
    });
    await page.getByLabel(t.upload.choose, { exact: true }).setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("not a photo"),
    });
    await expect(
      page.getByRole("alert").filter({ hasText: /\S/ }),
    ).toBeVisible();
    await expect(page.getByLabel(t.nameRu, { exact: true })).toHaveValue(
      "Проверка",
    );
    await page.route("**/api/admin/product-images", (route) =>
      route.fulfill({ status: 503, body: "{}" }),
    );
    await page
      .getByLabel(t.upload.choose, { exact: true })
      .setInputFiles("public/images/catalog/grey-marble-390.webp");
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
      t.upload.unavailable,
    );
    await page
      .getByRole("button", {
        name: t.upload.removeLabel.replace("{number}", "1"),
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: t.saveDraft, exact: true }).click();
    await expect(
      page.getByText(t.upload.required, { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(t.nameRu, { exact: true })).toHaveValue(
      "Проверка",
    );
  });
});

test("product photos: JPEG and upload limits", async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "auth-desktop",
    "Admin editing starts at 1024 px",
  );
  await signInInContext(context, SEEDED.admin);
  const t = en.admin.form;
  await newProduct(page, "en", {
    en: "JPEG Photo " + tag(),
    ru: "Фото JPEG",
    price: "125",
  });
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#8e9290";
    ctx.fillRect(0, 0, 240, 160);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await page.getByLabel(t.upload.choose, { exact: true }).setInputFiles({
    name: "stone.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(encoded, "base64"),
  });
  await expect(
    page.getByRole("status").filter({ hasText: t.upload.ready }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: t.upload.list }).getByRole("listitem"),
  ).toHaveCount(2);
  await page.getByLabel(t.upload.choose, { exact: true }).setInputFiles({
    name: "large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(30 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    t.upload.size,
  );
  await page.getByLabel(t.upload.choose, { exact: true }).setInputFiles(
    Array.from({ length: 7 }, (_, index) => ({
      name: "stone" + index + ".jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(encoded, "base64"),
    })),
  );
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    t.upload.limit,
  );
  await expect(
    page.getByRole("list", { name: t.upload.list }).getByRole("listitem"),
  ).toHaveCount(2);
});

for (const locale of ["ru", "en"] as const) {
  test(`product photos: ${locale} originals are prepared automatically and recover after limits`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "Admin editing starts at 1024 px",
    );
    await signInInContext(context, SEEDED.admin);
    const t = (locale === "ru" ? ru : en).admin.form;
    const decoders: string[] = [];
    page.on("request", (request) => {
      if (/\/heic-to\.[^/]+\.js/.test(request.url()))
        decoders.push(request.url());
    });
    await newProduct(page, locale, {
      en: "Original Photo " + tag(),
      ru: "Исходное фото",
      price: "125",
    });
    const slug = await page.getByLabel(t.slug, { exact: true }).inputValue();
    await page
      .getByRole("button", {
        name: t.upload.removeLabel.replace("{number}", "1"),
        exact: true,
      })
      .click();
    const jpeg = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 100;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#ff0000";
        context.fillRect(0, 0, 100, 100);
        context.fillStyle = "#00ff00";
        context.fillRect(100, 0, 100, 100);
        return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
      }),
      "base64",
    );
    // EXIF orientation 6: stored landscape pixels must become an upright portrait.
    const exif = Buffer.alloc(36);
    exif.writeUInt16BE(0xffe1, 0);
    exif.writeUInt16BE(34, 2);
    exif.write("Exif\0\0", 4, "binary");
    exif.write("II", 10);
    exif.writeUInt16LE(42, 12);
    exif.writeUInt32LE(8, 14);
    exif.writeUInt16LE(1, 18);
    exif.writeUInt16LE(0x112, 20);
    exif.writeUInt16LE(3, 22);
    exif.writeUInt32LE(1, 24);
    exif.writeUInt16LE(6, 28);
    const rotated = Buffer.concat([
      jpeg.subarray(0, 2),
      exif,
      jpeg.subarray(2),
    ]);
    const transparent = PNG.sync.write({
      width: 48,
      height: 24,
      data: Buffer.alloc(48 * 24 * 4),
    });
    const bmp = Buffer.alloc(54 + 48 * 24 * 3, 128);
    bmp.fill(0, 0, 54);
    bmp.write("BM");
    bmp.writeUInt32LE(bmp.length, 2);
    bmp.writeUInt32LE(54, 10);
    bmp.writeUInt32LE(40, 14);
    bmp.writeInt32LE(48, 18);
    bmp.writeInt32LE(24, 22);
    bmp.writeUInt16LE(1, 26);
    bmp.writeUInt16LE(24, 28);
    const sources = [
      {
        name: "camera.bin",
        mimeType: "",
        buffer: Buffer.concat([jpeg, Buffer.alloc(6 * 1024 * 1024)]),
        size: [200, 100],
      },
      {
        name: "portrait.jpg",
        mimeType: "image/jpeg",
        buffer: rotated,
        size: [100, 200],
      },
      {
        name: "transparent.png",
        mimeType: "image/png",
        buffer: transparent,
        size: [48, 24],
      },
      { name: "photo.bmp", mimeType: "image/bmp", buffer: bmp, size: [48, 24] },
    ];
    for (const source of sources) {
      const response = page.waitForResponse(
        (r) =>
          r.url().includes("/api/admin/product-images") &&
          r.request().method() === "POST",
      );
      await page.getByLabel(t.upload.choose, { exact: true }).setInputFiles({
        name: source.name,
        mimeType: source.mimeType,
        buffer: source.buffer,
      });
      const uploaded = await response;
      expect(uploaded.status()).toBe(201);
      expect(uploaded.request().headers()["content-type"]).toBe("image/png");
      const { image } = await uploaded.json();
      const stored = await page.request.get(image);
      expect(stored.status()).toBe(200);
      const bytes = await stored.body();
      const png = PNG.sync.read(bytes);
      expect([png.width, png.height]).toEqual(source.size);
      expect(bytes.length).toBeLessThanOrEqual(2 * 1024 * 1024);
      if (source.name === "transparent.png") expect(png.data[3]).toBe(0);
      if (source.name === "portrait.jpg") {
        expect(png.data[(20 * png.width + 20) * 4]).toBeGreaterThan(200);
        expect(png.data[(180 * png.width + 20) * 4 + 1]).toBeGreaterThan(200);
      }
    }
    const oversized = Buffer.from(transparent);
    oversized.writeUInt32BE(10_000, 16);
    oversized.writeUInt32BE(6001, 20);
    await page.getByLabel(t.upload.choose, { exact: true }).setInputFiles({
      name: "huge.png",
      mimeType: "image/png",
      buffer: oversized,
    });
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
      t.upload.pixels,
    );
    await expect(page.getByLabel(t.nameRu, { exact: true })).toHaveValue(
      "Исходное фото",
    );
    await page
      .getByLabel(t.upload.choose, { exact: true })
      .setInputFiles("public/images/catalog/grey-marble-390.webp");
    await expect(
      page.getByRole("status").filter({ hasText: t.upload.ready }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: t.upload.list }).getByRole("listitem"),
    ).toHaveCount(5);
    await page.getByRole("button", { name: t.saveDraft, exact: true }).click();
    await page.waitForURL(`**/${locale}/admin/products`);
    await page.goto(`/${locale}/admin/products/${slug}`);
    await page.reload();
    await expect(
      page.getByRole("list", { name: t.upload.list }).getByRole("listitem"),
    ).toHaveCount(5);
    expect(decoders).toHaveLength(0);
  });
}
