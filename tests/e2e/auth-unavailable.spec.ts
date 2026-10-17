import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

/*
 * No-database mode (spec section 2, review focus 4). Runs in the `desktop` and `mobile` projects, whose
 * `next start` has no DATABASE_URL (the config forces it empty), exactly like the preview before the owner
 * adds Neon: the catalog keeps working and the auth screens say sign-in is unavailable, no 500.
 */

const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;

test.describe("auth pages show unavailable without a database", () => {
  for (const locale of LOCALES) {
    for (const page of ["sign-in", "sign-up"] as const) {
      test(`/${locale}/${page}: the unavailable state, no form`, async ({
        page: browserPage,
      }) => {
        const t = MESSAGES[locale].auth;
        const response = await browserPage.goto(`/${locale}/${page}`);
        expect(response?.status()).toBe(200);
        await expect(
          browserPage.getByRole("heading", {
            level: 1,
            name: page === "sign-in" ? t.signIn.title : t.signUp.title,
          }),
        ).toBeVisible();
        await expect(
          browserPage
            .getByRole("status")
            .filter({ hasText: t.errors.unavailable }),
        ).toBeVisible();
        await expect(browserPage.locator("form")).toHaveCount(0);
        await expect(browserPage.locator("input")).toHaveCount(0);
        // The way out still works.
        await expect(
          browserPage.getByRole("link", { name: t.backToProducts }),
        ).toHaveAttribute("href", `/${locale}/catalog`);
      });
    }
  }

  test("the auth API answers 503 JSON, not a crash", async ({ request }) => {
    const response = await request.get("/api/auth/get-session");
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "auth-unavailable",
    });
  });

  test("the sign-out page sends everyone home", async ({ page }) => {
    await page.goto("/ru/sign-out");
    await expect(page).toHaveURL(/\/ru$/);
  });

  test("the catalog still works", async ({ page }) => {
    const response = await page.goto("/ru/catalog");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("the unavailable screen has no serious axe violations and no horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/ru/sign-in");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
