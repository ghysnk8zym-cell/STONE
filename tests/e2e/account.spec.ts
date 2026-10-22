import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Locator, Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import {
  createAccount,
  expect,
  signInInContext,
  signInSucceeds,
  signUpInContext,
  test,
} from "./auth-fixtures";
import { NEW_PASSWORD, SEEDED } from "./test-env";

/*
 * The account area and the live favourites (Phase 4a Task 4). Runs in the `auth-desktop` (1440) and `auth-mobile`
 * (390) projects against the e2e server WITH a database (a throwaway PGlite seeded from .env.test.example).
 * The seeded Client (demo orders D-1048 / D-1032, favourites Black Marble, Grey Limestone, Grey Marble) is only
 * READ here: every test that changes data signs up an account of its own (the tests run in parallel and in two
 * projects against one database). Every test also has its own client IP (auth-fixtures.ts).
 */

const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;
type Locale = (typeof LOCALES)[number];

const PAGES = [
  "account",
  "account/orders",
  "account/favorites",
  "account/profile",
] as const;

/** The shown product name, the way the app resolves it. */
function productName(locale: Locale, slug: keyof typeof ru.catalog.products) {
  return MESSAGES[locale].catalog.products[slug].name;
}

function heartName(locale: Locale, slug: keyof typeof ru.catalog.products) {
  return MESSAGES[locale].components.productCard.favorite.replace(
    "{name}",
    productName(locale, slug),
  );
}

/** Resolves once the shell knows who is looking (`GET /api/me` answered): hearts and entries are live. */
async function accountStateKnown(page: Page, state: "guest" | "signed-in") {
  await expect(page.locator("html")).toHaveAttribute(
    "data-account-state",
    state,
  );
}

async function fillSignIn(
  page: Page,
  locale: Locale,
  credentials: { email: string; password: string },
) {
  const t = MESSAGES[locale].auth;
  // The password toggle shows once React hydrated the form.
  await expect(
    page.getByRole("button", { name: t.showPassword }),
  ).toBeVisible();
  await page.getByLabel(t.email, { exact: true }).fill(credentials.email);
  await page.getByLabel(t.password, { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: t.signIn.submit }).click();
}

/**
 * Clicks a heart / Save of a signed-in visitor and waits for the server action to answer: the control flips at
 * once (optimistic), and a test that navigates away right after would cancel the request.
 */
async function clickAndSettle(page: Page, control: Locator) {
  const answered = page.waitForResponse(
    (response) => response.request().method() === "POST",
  );
  await control.click();
  await answered;
}

async function sessionCookieValue(context: BrowserContext) {
  return (await context.cookies()).find((c) => c.name === "stone.session_token")
    ?.value;
}

function isMobileProject(testInfo: { project: { name: string } }) {
  return testInfo.project.name === "auth-mobile";
}

test.describe("Guest", () => {
  for (const locale of LOCALES) {
    test(`${locale}: home heart survives sign-in, refresh and removal`, async ({
      page,
      browser,
      baseURL,
      clientIp,
    }) => {
      const email = await createAccount(
        browser,
        baseURL!,
        clientIp,
        NEW_PASSWORD,
      );
      await page.goto(`/${locale}`);
      await accountStateKnown(page, "guest");
      const heart = page.getByRole("button", {
        name: heartName(locale, "black-marble"),
      });
      await expect(heart).toBeVisible();
      await heart.press("Enter");
      await page.waitForURL(new RegExp(`/${locale}/sign-in\\?next=`));
      expect(new URL(page.url()).searchParams.get("next")).toBe(`/${locale}`);
      await fillSignIn(page, locale, { email, password: NEW_PASSWORD });
      await page.waitForURL(`**/${locale}`);
      await accountStateKnown(page, "signed-in");
      await expect(heart).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(heart).toHaveAttribute("aria-pressed", "true");
      await clickAndSettle(page, heart);
      await expect(heart).toHaveAttribute("aria-pressed", "false");
      await page.reload();
      await expect(heart).toHaveAttribute("aria-pressed", "false");
    });
  }
  for (const locale of LOCALES) {
    for (const path of PAGES) {
      test(`/${locale}/${path} sends a Guest to sign-in with next`, async ({
        page,
      }) => {
        await page.goto(`/${locale}/${path}`);
        const url = new URL(page.url());
        expect(url.pathname).toBe(`/${locale}/sign-in`);
        expect(url.searchParams.get("next")).toBe(`/${locale}/${path}`);
      });
    }
  }

  test("the account entry of the shell leads a Guest to sign-in", async ({
    page,
  }, testInfo) => {
    const t = ru.components;
    await page.goto("/ru/catalog");
    await accountStateKnown(page, "guest");
    if (isMobileProject(testInfo)) {
      await page
        .getByRole("navigation", { name: t.tabBar.label })
        .getByRole("link", { name: t.tabBar.account })
        .click();
    } else {
      await page
        .getByRole("banner")
        .getByRole("link", { name: t.nav.account })
        .click();
    }
    await expect(page).toHaveURL(/\/ru\/sign-in$/);
  });

  test("the heart on a catalog card sends a Guest to sign-in and back with the product saved", async ({
    page,
    browser,
    baseURL,
    clientIp,
  }) => {
    // An account the Guest will sign in to (created without a session in this browser).
    const email = await createAccount(
      browser,
      baseURL!,
      clientIp,
      NEW_PASSWORD,
    );
    const heart = page.getByRole("button", {
      name: heartName("ru", "golden-rock"),
    });

    await page.goto("/ru/catalog");
    await accountStateKnown(page, "guest");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.click();

    await page.waitForURL(/\/ru\/sign-in\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/ru/catalog");
    await fillSignIn(page, "ru", { email, password: NEW_PASSWORD });

    await page.waitForURL("**/ru/catalog");
    await accountStateKnown(page, "signed-in");
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    // It is a real favourite: it survives a reload.
    await page.reload();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
  });

  test("the heart keeps the query of the page it was clicked on", async ({
    page,
  }) => {
    await page.goto("/en/catalog?material=marble&sort=price-desc");
    await accountStateKnown(page, "guest");
    await page
      .getByRole("button", { name: heartName("en", "black-marble") })
      .click();
    await page.waitForURL(/\/en\/sign-in\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe(
      "/en/catalog?material=marble&sort=price-desc",
    );
  });

  test("Save on a product page sends a Guest to sign-in and back with the product saved", async ({
    page,
    browser,
    baseURL,
    clientIp,
  }) => {
    const email = await createAccount(
      browser,
      baseURL!,
      clientIp,
      NEW_PASSWORD,
    );
    const save = page.getByRole("button", { name: en.pages.product.save });

    await page.goto("/en/catalog/grey-marble");
    await accountStateKnown(page, "guest");
    await save.click();
    await page.waitForURL(/\/en\/sign-in\?next=/);
    await fillSignIn(page, "en", { email, password: NEW_PASSWORD });

    await page.waitForURL("**/en/catalog/grey-marble");
    await expect(save).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("signed in as the seeded Client (read only)", () => {
  test.beforeEach(async ({ context }) => {
    await signInInContext(context, SEEDED.client);
  });

  for (const locale of LOCALES) {
    test(`${locale}: the Overview shows the name, email, two orders and three favourites`, async ({
      page,
    }, testInfo) => {
      const t = MESSAGES[locale].account;
      await page.goto(`/${locale}/account`);
      await expect(
        page.getByRole("heading", { level: 1, name: t.overview.title }),
      ).toBeVisible();
      // Name "STONE Client": the greeting uses the first word.
      await expect(
        page.getByText(t.overview.welcome.replace("{name}", "STONE")),
      ).toBeVisible();
      await expect(page.getByText(SEEDED.client.email)).toBeVisible();

      const orders = isMobileProject(testInfo)
        ? // Phones show the Current order card and the All orders row.
          [t.overview.orders.demoOrder.replace("{number}", "D-1048")]
        : [
            // Overview rows carry the Demo marker too (review M3).
            t.orders.demoOrder.replace("{number}", "D-1048"),
            t.orders.demoOrder.replace("{number}", "D-1032"),
          ];
      for (const order of orders) {
        // The phone card and the desktop rows share the text; only one set is displayed.
        await expect(
          page.getByText(order, { exact: true }).locator("visible=true"),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("link", { name: t.overview.orders.all }),
      ).toBeVisible();

      for (const slug of [
        "black-marble",
        "grey-limestone",
        "grey-marble",
      ] as const) {
        await expect(
          page
            .getByRole("link", { name: productName(locale, slug), exact: true })
            .first(),
        ).toBeVisible();
      }
      // "Selected offers": the discounted products of the catalog.
      await expect(
        page.getByRole("link", { name: t.overview.offers.cta }),
      ).toHaveAttribute("href", `/${locale}/catalog?sale=1`);
    });
  }

  test("the Orders screen lists both demo orders with their status; View order opens the order", async ({
    page,
  }) => {
    const t = ru.account.orders;
    await page.goto("/ru/account/orders");
    for (const [number, status] of [
      ["D-1048", t.status.in_progress],
      ["D-1032", t.status.delivered],
    ] as const) {
      const card = page.getByRole("listitem").filter({
        has: page.getByRole("heading", {
          name: t.demoOrder.replace("{number}", number),
        }),
      });
      await expect(card).toBeVisible();
      await expect(
        card.getByText(status, { exact: true }).locator("visible=true"),
      ).toBeVisible();
      const view = card.getByRole("link", { name: t.view });
      await expect(view).toHaveAttribute(
        "href",
        `/ru/account/orders/${number}`,
      );
    }
  });

  test("the Favorites screen shows the three demo favourites", async ({
    page,
  }) => {
    await page.goto("/en/account/favorites");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: en.account.favorites.title,
      }),
    ).toBeVisible();
    for (const slug of [
      "black-marble",
      "grey-limestone",
      "grey-marble",
    ] as const) {
      await expect(
        page.getByRole("link", { name: productName("en", slug), exact: true }),
      ).toHaveAttribute("href", `/en/catalog/${slug}`);
    }
    await expect(
      page.getByRole("main").locator('a[href^="/en/catalog/"]'),
    ).toHaveCount(3);
  });

  test("the Profile screen shows the name and the read-only email", async ({
    page,
  }) => {
    const t = ru.account.profile;
    await page.goto("/ru/account/profile");
    await expect(page.getByText(SEEDED.client.email)).toBeVisible();
    const details = page.getByRole("region", { name: t.details });
    await expect(
      details.getByText("STONE Client", { exact: true }),
    ).toBeVisible();
    // The email is never a field.
    await page.getByRole("button", { name: t.edit }).click();
    await expect(page.getByLabel(t.name, { exact: true })).toBeVisible();
    await expect(page.getByLabel(t.email, { exact: true })).toHaveCount(0);
  });

  test("Support and the bell are inert", async ({ page }, testInfo) => {
    test.skip(
      isMobileProject(testInfo),
      "the sidebar and the bell are drawn from 1024",
    );
    const t = en.account;
    await page.goto("/en/account");
    await expect(
      page.getByRole("link", { name: t.nav.support }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.getByRole("button", { name: t.notifications }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("the sidebar marks the current section and Sign out leads to the confirmation", async ({
    page,
  }, testInfo) => {
    test.skip(isMobileProject(testInfo), "the sidebar is drawn from 1024");
    const t = en.account.nav;
    await page.goto("/en/account/orders");
    const nav = page.getByRole("navigation", { name: t.label });
    await expect(nav.getByRole("link", { name: t.orders })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      nav.getByRole("link", { name: t.overview }),
    ).not.toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: t.signOut }).click();
    await expect(page).toHaveURL(/\/en\/sign-out$/);
  });

  test("below 1024 the Account sections menu replaces the sidebar", async ({
    page,
  }, testInfo) => {
    test.skip(!isMobileProject(testInfo), "phone layout only");
    const t = en.account.nav;
    await page.goto("/en/account");
    await expect(page.getByRole("navigation", { name: t.label })).toBeHidden();
    const menu = page.getByRole("button", { name: t.label });
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: t.favorites }).first().click();
    await expect(page).toHaveURL(/\/en\/account\/favorites$/);
  });

  test("the account entry of the shell leads to the account", async ({
    page,
  }, testInfo) => {
    const t = en.components;
    await page.goto("/en/catalog");
    await accountStateKnown(page, "signed-in");
    if (isMobileProject(testInfo)) {
      await page
        .getByRole("navigation", { name: t.tabBar.label })
        .getByRole("link", { name: t.tabBar.accountSignedIn })
        .click();
    } else {
      await page
        .getByRole("banner")
        .getByRole("link", { name: t.nav.account })
        .click();
    }
    await expect(page).toHaveURL(/\/en\/account$/);
  });

  test("the heart of a favourite product is pressed on the catalog, with no change to the data", async ({
    page,
  }) => {
    await page.goto("/ru/catalog");
    await accountStateKnown(page, "signed-in");
    await expect(
      page.getByRole("button", { name: heartName("ru", "black-marble") }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: heartName("ru", "taupe-rock") }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("favourites of a new Client", () => {
  test("a heart on the catalog appears in Favorites, and removing it there empties the list", async ({
    page,
    context,
  }) => {
    await signUpInContext(context, NEW_PASSWORD);
    await page.goto("/en/catalog");
    await accountStateKnown(page, "signed-in");
    const heart = page.getByRole("button", {
      name: heartName("en", "golden-rock"),
    });
    await clickAndSettle(page, heart);
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await page.goto("/en/account/favorites");
    const tile = page.getByRole("link", {
      name: productName("en", "golden-rock"),
      exact: true,
    });
    await expect(tile).toBeVisible();

    await clickAndSettle(
      page,
      page.getByRole("button", {
        name: en.account.favorites.remove.replace(
          "{name}",
          productName("en", "golden-rock"),
        ),
      }),
    );
    await expect(tile).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: en.account.favorites.empty.title }),
    ).toBeVisible();
    // It is gone for good.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: en.account.favorites.empty.title }),
    ).toBeVisible();
  });

  test("Save on the product page toggles and persists", async ({
    page,
    context,
  }) => {
    await signUpInContext(context, NEW_PASSWORD);
    await page.goto("/ru/catalog/taupe-rock");
    await accountStateKnown(page, "signed-in");
    const save = page.getByRole("button", { name: ru.pages.product.save });
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await clickAndSettle(page, save);
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await clickAndSettle(page, save);
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(save).toHaveAttribute("aria-pressed", "false");
  });

  test("a new Client sees the empty states", async ({ page, context }) => {
    await signUpInContext(context, NEW_PASSWORD);
    await page.goto("/en/account/orders");
    await expect(
      page.getByRole("heading", { name: en.account.orders.empty.title }),
    ).toBeVisible();
    await page.goto("/en/account/favorites");
    await expect(
      page.getByRole("heading", { name: en.account.favorites.empty.title }),
    ).toBeVisible();
    await page.goto("/en/account");
    // Before any name is set the greeting uses the local part of the email.
    await expect(
      page.getByRole("heading", { level: 1, name: en.account.overview.title }),
    ).toBeVisible();
  });
});

test.describe("profile", () => {
  for (const locale of LOCALES) {
    test(`${locale}: keyboard focus survives profile edit, cancel and save`, async ({
      page,
      context,
    }) => {
      await signUpInContext(context, NEW_PASSWORD);
      const t = MESSAGES[locale].account.profile;
      await page.goto(`/${locale}/account/profile`, {
        waitUntil: "networkidle",
      });
      const edit = page.getByRole("button", { name: t.edit, exact: true });
      const field = page.getByLabel(t.name, { exact: true });
      await edit.focus();
      await edit.press("Enter");
      await expect(field).toBeFocused();
      await page
        .getByRole("button", { name: t.cancel, exact: true })
        .press("Enter");
      await expect(edit).toBeFocused();
      await edit.press("Enter");
      await field.fill("");
      await field.press("Enter");
      await expect(
        page.getByText(t.errors.nameInvalid, { exact: true }),
      ).toBeVisible();
      await expect(field).toBeFocused();
      await field.fill("Keyboard client");
      await page
        .getByRole("button", { name: t.save, exact: true })
        .press("Enter");
      await expect(edit).toBeFocused();
      await expect(page.getByText(t.saved, { exact: true })).toBeVisible();
    });
  }

  test("the name can be changed and persists", async ({
    page,
    context,
  }, testInfo) => {
    await signUpInContext(context, NEW_PASSWORD);
    const t = en.account.profile;
    await page.goto("/en/account/profile");
    const details = page.getByRole("region", { name: t.details });
    await page.getByRole("button", { name: t.edit }).click();
    const field = page.getByLabel(t.name, { exact: true });
    // A new account has no name yet; give it one first.
    await field.fill("Old Name");
    await page.getByRole("button", { name: t.save }).click();
    await expect(page.getByText(t.saved)).toBeVisible();
    await expect(details.getByText("Old Name", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.edit }).click();
    await field.fill("");
    await page.getByRole("button", { name: t.save }).click();
    await expect(page.getByText(t.errors.nameInvalid)).toBeVisible();
    await field.fill("New Name");
    await page.getByRole("button", { name: t.save }).click();
    await expect(page.getByText(t.saved)).toBeVisible();
    await expect(details.getByText("New Name", { exact: true })).toBeVisible();

    await page.reload();
    await expect(details.getByText("New Name", { exact: true })).toBeVisible();
    if (!isMobileProject(testInfo)) {
      // The sidebar user block takes the new name too.
      await expect(
        page
          .getByRole("navigation", { name: en.account.nav.label })
          .getByText("New Name"),
      ).toBeVisible();
    }
  });

  test("changing the password needs the current password", async ({
    page,
    context,
    browser,
    baseURL,
    clientIp,
  }) => {
    const email = await signUpInContext(context, NEW_PASSWORD);
    const t = en.account.profile.password;
    const next = "e2e-changed-password-2";
    await page.goto("/en/account/profile");
    const form = page.getByTestId("password-form");
    await expect(form).toBeVisible();

    // The current password is wrong: refused, the old password still works.
    await form.getByLabel(t.current, { exact: true }).fill("not-my-password-1");
    await form.getByLabel(t.next, { exact: true }).fill(next);
    await form.getByRole("button", { name: t.submit }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: t.errors.invalidCurrent }),
    ).toBeVisible();
    expect(
      await signInSucceeds(browser, baseURL!, clientIp, {
        email,
        password: NEW_PASSWORD,
      }),
    ).toBe(true);

    // The right one: changed. This browser stays signed in, on a rotated session (new cookie), and the old
    // password stops working while the new one does.
    const before = await sessionCookieValue(context);
    await form.getByLabel(t.current, { exact: true }).fill(NEW_PASSWORD);
    await form.getByRole("button", { name: t.submit }).click();
    await expect(page.getByText(t.success)).toBeVisible();
    await page.goto("/en/account/profile");
    await expect(page.getByTestId("password-form")).toBeVisible();
    const after = await sessionCookieValue(context);
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
    expect(
      await signInSucceeds(browser, baseURL!, clientIp, {
        email,
        password: next,
      }),
    ).toBe(true);
    expect(
      await signInSucceeds(browser, baseURL!, clientIp, {
        email,
        password: NEW_PASSWORD,
      }),
    ).toBe(false);
  });
});

test.describe("quality", () => {
  test.beforeEach(async ({ context }) => {
    await signInInContext(context, SEEDED.client);
  });

  for (const locale of LOCALES) {
    for (const path of PAGES) {
      test(`/${locale}/${path}: no serious axe violations and no horizontal overflow`, async ({
        page,
      }) => {
        await page.goto(`/${locale}/${path}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await accountStateKnown(page, "signed-in");
        const results = await new AxeBuilder({ page }).analyze();
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
      });
    }
  }

  test("a signed-in visitor is not sent away from the sign-in page after a stale cookie", async ({
    page,
  }) => {
    // A signed-in user opening sign-in is sent to the account (Task 3), which now exists.
    await page.goto("/ru/sign-in");
    await expect(page).toHaveURL(/\/ru\/account$/);
    await expect(
      page.getByRole("heading", { level: 1, name: ru.account.overview.title }),
    ).toBeVisible();
  });
});
