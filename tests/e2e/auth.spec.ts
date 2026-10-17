import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext, Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

import { expect, test } from "./auth-fixtures";
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

/** Signs in through the API (no UI), which stores the session cookie in the browser context. */
async function signInViaApi(
  context: BrowserContext,
  baseURL: string,
  clientIp: string,
  credentials: { email: string; password: string },
) {
  const response = await context.request.post("/api/auth/sign-in/email", {
    data: credentials,
    headers: { origin: baseURL, "x-forwarded-for": clientIp },
  });
  expect(response.status()).toBe(200);
}

async function currentUserEmail(page: Page): Promise<string | null> {
  const response = await page.request.get("/api/auth/get-session");
  const body = (await response.json()) as { user?: { email: string } } | null;
  return body?.user?.email ?? null;
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

  test("sign-in errors do not reveal account existence", async ({
    page,
    baseURL,
    clientIp,
  }) => {
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

    // And at the API: same status, same code, same message.
    const answers = [];
    for (const email of [SEEDED.client.email, "nobody-else@example.test"]) {
      const response = await page.request.post("/api/auth/sign-in/email", {
        data: { email, password: "definitely-wrong-password-2" },
        headers: { origin: baseURL!, "x-forwarded-for": clientIp },
      });
      answers.push({ status: response.status(), body: await response.json() });
    }
    expect(answers[0]!.status).toBe(401);
    expect(answers[1]).toEqual(answers[0]);
  });

  test("repeated failed sign-ins are rate limited", async ({
    page,
    baseURL,
    clientIp,
  }) => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await page.request.post("/api/auth/sign-in/email", {
        data: {
          email: SEEDED.client.email,
          password: `wrong-password-${attempt}`,
        },
        headers: { origin: baseURL!, "x-forwarded-for": clientIp },
      });
      statuses.push(response.status());
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  test("a signed-in user is sent from sign-in and sign-up to the account page", async ({
    page,
    context,
    baseURL,
    clientIp,
  }) => {
    await signInViaApi(context, baseURL!, clientIp, SEEDED.client);
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
      baseURL,
      clientIp,
    }) => {
      const t = MESSAGES[locale].auth.signOutPage;
      await signInViaApi(context, baseURL!, clientIp, SEEDED.client);
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
    baseURL,
    clientIp,
  }) => {
    await signInViaApi(context, baseURL!, clientIp, SEEDED.client);
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
        baseURL,
        clientIp,
      }) => {
        if (needsSession) {
          await signInViaApi(context, baseURL!, clientIp, SEEDED.client);
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
    baseURL,
    clientIp,
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
    await signInViaApi(context, baseURL!, clientIp, SEEDED.client);
    await page.goto("/ru/sign-out");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
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
