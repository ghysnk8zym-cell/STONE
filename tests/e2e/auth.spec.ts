import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import { expect, signInInContext, test } from "./auth-fixtures";
import { NEW_PASSWORD, SEEDED, uniqueEmail } from "./test-env";

/*
 * Sign-up, sign-in and sign-out (Phase 4a Task 3). Runs in the `auth-desktop` (1440) and `auth-mobile`
 * (390) projects against the e2e server WITH a database (a throwaway PGlite seeded from
 * .env.test.example). The no-database state is tests/e2e/auth-unavailable.spec.ts.
 * Every test has its own client IP (auth-fixtures.ts), so the rate limits never trip by accident.
 * /{locale}/account has no page yet (Task 4): the tests check the URL, not the page behind it.
 */

const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;
const SESSION_COOKIE = "stone.session_token";

async function hasSessionCookie(context: BrowserContext) {
  return (await context.cookies()).some((c) => c.name === SESSION_COOKIE);
}

/**
 * The address of the signed-in user as the server sees it, or null for a Guest: read from the profile page (the
 * Better Auth HTTP API is not exposed, so there is no get-session to ask).
 */
async function currentUserEmail(page: Page): Promise<string | null> {
  const response = await page.request.get("/en/account/profile", {
    maxRedirects: 0,
  });
  if (response.status() !== 200) return null;
  const match = /[\w.+-]+@example\.test/.exec(await response.text());
  return match ? match[0] : null;
}

/** Resolves once React hydrated the form: the password toggle is hidden until then. */
async function formReady(page: Page, locale: (typeof LOCALES)[number]) {
  await expect(
    page.getByRole("button", { name: MESSAGES[locale].auth.showPassword }),
  ).toBeVisible();
}

async function submitCredentials(
  page: Page,
  locale: (typeof LOCALES)[number],
  mode: "signIn" | "signUp",
  credentials: { email: string; password: string },
) {
  const t = MESSAGES[locale].auth;
  await page.getByLabel(t.email, { exact: true }).fill(credentials.email);
  await page.getByLabel(t.password, { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: t[mode].submit }).click();
}

test.describe("sign-up", () => {
  for (const locale of LOCALES) {
    test(`${locale}: creates an account and lands on the account page`, async ({
      page,
      context,
    }) => {
      const t = MESSAGES[locale].auth;
      const email = uniqueEmail();
      await page.goto(`/${locale}/sign-up`);
      await expect(
        page.getByRole("heading", { level: 1, name: t.signUp.title }),
      ).toBeVisible();
      await formReady(page, locale);
      await submitCredentials(page, locale, "signUp", {
        email,
        password: NEW_PASSWORD,
      });
      await page.waitForURL(`**/${locale}/account`);
      expect(await hasSessionCookie(context)).toBe(true);
      expect(await currentUserEmail(page)).toBe(email);
    });
  }

  test("a second sign-up with the same email shows the email-taken error and keeps the input", async ({
    page,
  }) => {
    const t = ru.auth;
    await page.goto("/ru/sign-up");
    await formReady(page, "ru");
    await submitCredentials(page, "ru", "signUp", {
      email: SEEDED.client.email,
      password: NEW_PASSWORD,
    });
    const error = page
      .getByRole("alert")
      .filter({ hasText: t.errors.emailTaken });
    await expect(error).toBeVisible();
    await expect(page).toHaveURL(/\/ru\/sign-up$/);
    const field = page.getByLabel(t.email, { exact: true });
    await expect(field).toHaveValue(SEEDED.client.email);
    await expect(field).toHaveAttribute("aria-invalid", "true");
  });

  test("a weak password is refused with the password error", async ({
    page,
  }) => {
    const t = en.auth;
    await page.goto("/en/sign-up");
    await formReady(page, "en");
    await submitCredentials(page, "en", "signUp", {
      email: uniqueEmail(),
      password: "1234567",
    });
    await expect(
      page.getByRole("alert").filter({ hasText: t.errors.weakPassword }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/en\/sign-up$/);
    await expect(page.getByLabel(t.password, { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("the show-password button reveals and hides the password", async ({
    page,
  }) => {
    await page.goto("/en/sign-up");
    const toggle = page.getByRole("button", {
      name: en.auth.showPassword,
    });
    await expect(toggle).toBeVisible();
    const field = page.getByLabel(en.auth.password, { exact: true });
    await field.fill("a-secret-value");
    await expect(field).toHaveAttribute("type", "password");
    await toggle.click();
    await expect(field).toHaveAttribute("type", "text");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(field).toHaveAttribute("type", "password");
  });

  test("sign-up keeps next and links to sign-in with it", async ({ page }) => {
    await page.goto("/ru/sign-up?next=/ru/catalog");
    await expect(
      page.getByRole("link", { name: ru.auth.signUp.signInLink }),
    ).toHaveAttribute("href", /\/ru\/sign-in\?next=%2Fru%2Fcatalog$/);
    await formReady(page, "ru");
    await submitCredentials(page, "ru", "signUp", {
      email: uniqueEmail(),
      password: NEW_PASSWORD,
    });
    await page.waitForURL("**/ru/catalog");
  });
});

test.describe("sign-in", () => {
  for (const locale of LOCALES) {
    test(`${locale}: signs in and goes to the account page`, async ({
      page,
      context,
    }) => {
      await page.goto(`/${locale}/sign-in`);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: MESSAGES[locale].auth.signIn.title,
        }),
      ).toBeVisible();
      await formReady(page, locale);
      await submitCredentials(page, locale, "signIn", SEEDED.client);
      await page.waitForURL(`**/${locale}/account`);
      expect(await hasSessionCookie(context)).toBe(true);
      expect(await currentUserEmail(page)).toBe(SEEDED.client.email);
    });
  }

  test("returns to next after signing in", async ({ page }) => {
    await page.goto("/ru/sign-in?next=/ru/catalog");
    await formReady(page, "ru");
    await submitCredentials(page, "ru", "signIn", SEEDED.client);
    await page.waitForURL("**/ru/catalog");
  });

  for (const evil of [
    "//evil.example",
    "https://evil.example/ru/account",
    "/\\evil.example",
    "%2F%2Fevil.example",
  ]) {
    test(`sign-in ignores external next (${evil})`, async ({ page }) => {
      await page.goto(`/ru/sign-in?next=${encodeURIComponent(evil)}`);
      await formReady(page, "ru");
      await submitCredentials(page, "ru", "signIn", SEEDED.client);
      await page.waitForURL("**/ru/account");
      expect(new URL(page.url()).hostname).toBe("localhost");
    });
  }

  test("sign-in errors do not reveal account existence", async ({ page }) => {
    // Through the UI: one message for a wrong password and for an unknown email.
    const t = ru.auth;
    const messages: string[] = [];
    const statuses: number[] = [];
    page.on("response", (response) => {
      if (
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/ru/sign-in"
      ) {
        statuses.push(response.status());
      }
    });
    for (const email of [SEEDED.client.email, "nobody@example.test"]) {
      await page.goto("/ru/sign-in");
      await formReady(page, "ru");
      await submitCredentials(page, "ru", "signIn", {
        email,
        password: "definitely-wrong-password-1",
      });
      const alert = page.getByRole("alert").filter({
        hasText: t.errors.invalidCredentials,
      });
      await expect(alert).toBeVisible();
      messages.push((await alert.textContent()) ?? "");
    }
    expect(messages[0]).toBe(messages[1]);
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toBe(statuses[1]);
  });

  test("repeated failed sign-ins are rate limited", async ({ page }) => {
    // Through the form (the only way in): ten refusals with the uniform message, then "too many attempts".
    const messages = ru.auth.errors;
    for (let attempt = 0; attempt < 11; attempt++) {
      await page.goto("/ru/sign-in");
      await formReady(page, "ru");
      await submitCredentials(page, "ru", "signIn", {
        email: SEEDED.client.email,
        password: `wrong-password-${attempt}`,
      });
      const expected =
        attempt < 10 ? messages.invalidCredentials : messages.tooManyAttempts;
      await expect(
        page.getByRole("alert").filter({ hasText: expected }),
      ).toBeVisible();
    }
  });

  test("a signed-in user is sent from sign-in and sign-up to the account page", async ({
    page,
    context,
  }) => {
    await signInInContext(context, SEEDED.client);
    await page.goto("/ru/sign-in");
    await expect(page).toHaveURL(/\/ru\/account$/);
    await page.goto("/en/sign-up");
    await expect(page).toHaveURL(/\/en\/account$/);
  });
});

test.describe("sign-out", () => {
  for (const locale of LOCALES) {
    test(`${locale}: confirming ends the session and goes home`, async ({
      page,
      context,
    }) => {
      const t = MESSAGES[locale].auth.signOutPage;
      await signInInContext(context, SEEDED.client);
      expect(await currentUserEmail(page)).toBe(SEEDED.client.email);

      await page.goto(`/${locale}/sign-out`);
      await expect(
        page.getByRole("heading", { level: 1, name: t.title }),
      ).toBeVisible();
      await expect(page.getByRole("banner")).toBeVisible();
      await page.getByRole("button", { name: t.confirm }).click();
      await page.waitForURL(new RegExp(`/${locale}$`));

      // The session is gone on the server (not just the cookie), and the protected area asks again.
      expect(await currentUserEmail(page)).toBeNull();
      expect(await hasSessionCookie(context)).toBe(false);
      await page.goto(`/${locale}/account`);
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/sign-in\\?next=%2F${locale}%2Faccount$`),
      );
    });
  }

  test("staying signed in goes back to the account and keeps the session", async ({
    page,
    context,
  }) => {
    await signInInContext(context, SEEDED.client);
    await page.goto("/ru/sign-out");
    await page.getByRole("link", { name: ru.auth.signOutPage.stay }).click();
    await page.waitForURL("**/ru/account");
    expect(await currentUserEmail(page)).toBe(SEEDED.client.email);
  });

  test("a Guest on the sign-out page is sent home", async ({ page }) => {
    await page.goto("/en/sign-out");
    await expect(page).toHaveURL(/\/en$/);
  });
});

for (const javaScriptEnabled of [true, false]) {
  test.describe(`failed sign-out (JavaScript ${javaScriptEnabled})`, () => {
    test.use({ javaScriptEnabled });

    test("throttled logout preserves the session, explains the failure and permits a retry", async ({
      page,
      context,
      playwright,
      baseURL,
      clientIp,
    }) => {
      const locale = javaScriptEnabled ? "en" : "ru";
      const t = MESSAGES[locale].auth.signOutPage;
      await signInInContext(context, SEEDED.client);
      // Obtain the real production-build action from its HTML, as a no-JS form does.
      const html = await (await page.request.get(`/${locale}/sign-out`)).text();
      const action = /name="(\$ACTION_ID_[^"]+)"/.exec(html)?.[1];
      if (!action)
        throw new Error("sign-out action missing from server-rendered form");
      const anonymous = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: { origin: baseURL!, "x-forwarded-for": clientIp },
      });
      try {
        // Exhaust this test's logout bucket without sending or revoking its session.
        for (let attempt = 0; attempt < 100; attempt++) {
          const response = await anonymous.post(`/${locale}/sign-out`, {
            multipart: { [action]: "", locale },
            maxRedirects: 0,
          });
          expect(response.status()).toBe(303);
        }
        await page.goto(`/${locale}/sign-out`);
        await page
          .getByRole("button", { name: t.confirm, exact: true })
          .click();
        await expect(page).toHaveURL(
          new RegExp(`/${locale}/sign-out\\?error=tooManyAttempts$`),
        );
        await expect(
          page.getByRole("alert").filter({ hasText: t.errors.tooManyAttempts }),
        ).toBeVisible();
        expect(await hasSessionCookie(context)).toBe(true);
        expect(await currentUserEmail(page)).toBe(SEEDED.client.email);
        // A new test IP permits retry without sleeping for the production rate-limit window.
        await context.setExtraHTTPHeaders({
          "x-forwarded-for": `192.${clientIp.split(".").slice(1).join(".")}`,
        });
        await page
          .getByRole("button", { name: t.confirm, exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`/${locale}$`));
        expect(await hasSessionCookie(context)).toBe(false);
        expect(await currentUserEmail(page)).toBeNull();
      } finally {
        await anonymous.dispose();
      }
    });
  });
}

test.describe("sign-in and sign-up work without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a weak password shows the error, a valid sign-up signs in", async ({
    page,
    context,
  }) => {
    const t = ru.auth;
    await page.goto("/ru/sign-up");
    await submitCredentials(page, "ru", "signUp", {
      email: uniqueEmail(),
      password: "short",
    });
    await expect(
      page.getByRole("alert").filter({ hasText: t.errors.weakPassword }),
    ).toBeVisible();
    await submitCredentials(page, "ru", "signUp", {
      email: uniqueEmail(),
      password: NEW_PASSWORD,
    });
    await page.waitForURL("**/ru/account");
    expect(await hasSessionCookie(context)).toBe(true);
  });

  test("sign-out works as a plain form post", async ({ page, context }) => {
    await signInInContext(context, SEEDED.client);
    await page.goto("/en/sign-out");
    await page
      .getByRole("button", { name: en.auth.signOutPage.confirm })
      .click();
    await page.waitForURL(/\/en$/);
    expect(await currentUserEmail(page)).toBeNull();
    expect(await hasSessionCookie(context)).toBe(false);
  });

  test("sign-in works as a plain form post", async ({ page, context }) => {
    await page.goto("/en/sign-in?next=/en/catalog");
    await submitCredentials(page, "en", "signIn", SEEDED.client);
    await page.waitForURL("**/en/catalog");
    expect(await hasSessionCookie(context)).toBe(true);
  });
});

test.describe("layout and quality", () => {
  const PAGES = [
    { path: "sign-in", needsSession: false },
    { path: "sign-up", needsSession: false },
    { path: "sign-out", needsSession: true },
  ] as const;

  for (const { path, needsSession } of PAGES) {
    for (const locale of LOCALES) {
      test(`/${locale}/${path}: no serious axe violations and no horizontal overflow`, async ({
        page,
        context,
      }) => {
        if (needsSession) {
          await signInInContext(context, SEEDED.client);
        }
        const response = await page.goto(`/${locale}/${path}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.getByRole("main")).toHaveCount(1);

        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          serious.map((v) => `${v.id}: ${v.help}`),
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

  test("sign-in and sign-up draw no site header or footer; sign-out draws the shell", async ({
    page,
    context,
  }) => {
    for (const path of ["sign-in", "sign-up"]) {
      await page.goto(`/ru/${path}`);
      await expect(page.getByRole("banner")).toHaveCount(0);
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
      const back = page.getByRole("link", { name: ru.auth.backToProducts });
      await expect(back).toHaveAttribute("href", "/ru/catalog");
      // Painted above the photo and not covered by anything: a trial click checks that it would
      // receive the event (a link stacked under the scene is in the accessibility tree but not hit).
      await back.click({ trial: true });
    }
    await signInInContext(context, SEEDED.client);
    await page.goto("/ru/sign-out");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("the Russian sign-up title stays on one line at 1440 in the compact layout and the page does not overflow", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "auth-desktop", "1440 layout only");
    await page.goto("/ru/sign-up");
    const box = (await page.locator("h1").boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(50);
    await expect(page.locator("h1")).toHaveCSS("font-size", "42px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1440);
  });

  test("the auth background loads exactly one image", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/images/auth/")) {
        requested.push(new URL(request.url()).pathname);
      }
    });
    await page.goto("/ru/sign-up", { waitUntil: "networkidle" });
    expect(requested).toHaveLength(1);
  });
});
