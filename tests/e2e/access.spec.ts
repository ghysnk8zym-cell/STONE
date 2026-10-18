import type { APIRequestContext } from "@playwright/test";

import { expect, test } from "./auth-fixtures";
import { SEEDED } from "./test-env";

/*
 * The access matrix (Phase 4a Task 6, docs/ROLES.md): Guest / Client / Admin against every account and admin
 * route in both languages. Runs in the `auth-desktop` and `auth-mobile` projects against the e2e server WITH a
 * database. The rule, in one table:
 *
 *            account/*            admin/*
 *   Guest    307 -> sign-in?next  307 -> sign-in?next
 *   Client   200                  404 (the admin area does not reveal that it exists)
 *   Admin    200                  200
 *
 * Every test has its own client IP (auth-fixtures.ts), so the sign-in rate limit (10 / min and IP) is never shared.
 */

const LOCALES = ["ru", "en"] as const;

const ACCOUNT_PATHS = [
  "account",
  "account/orders",
  "account/favorites",
  "account/profile",
] as const;

const ADMIN_PATHS = [
  "admin",
  "admin/products",
  "admin/orders",
  "admin/customers",
  "admin/promotions",
  "admin/site-content",
  "admin/create-your-stone",
] as const;

type Role = "Guest" | "Client" | "Admin";

/** The expected answer for a role on an area. */
function expectedStatus(role: Role, area: "account" | "admin"): number {
  if (role === "Guest") return 307;
  if (area === "account") return 200;
  return role === "Admin" ? 200 : 404;
}

async function signIn(
  request: APIRequestContext,
  baseURL: string,
  clientIp: string,
  credentials: { email: string; password: string },
) {
  const response = await request.post("/api/auth/sign-in/email", {
    data: credentials,
    headers: { origin: baseURL, "x-forwarded-for": clientIp },
  });
  expect(response.status()).toBe(200);
}

const ROLES: { role: Role; credentials: typeof SEEDED.client | null }[] = [
  { role: "Guest", credentials: null },
  { role: "Client", credentials: SEEDED.client },
  { role: "Admin", credentials: SEEDED.admin },
];

for (const { role, credentials } of ROLES) {
  test.describe(role, () => {
    for (const locale of LOCALES) {
      for (const [area, paths] of [
        ["account", ACCOUNT_PATHS],
        ["admin", ADMIN_PATHS],
      ] as const) {
        for (const path of paths) {
          const status = expectedStatus(role, area);
          test(`/${locale}/${path} answers ${status}`, async ({
            page,
            context,
            baseURL,
            clientIp,
          }) => {
            if (credentials) {
              await signIn(context.request, baseURL!, clientIp, credentials);
            }
            const url = `/${locale}/${path}`;

            if (role === "Guest") {
              // The first answer is the redirect itself (the middleware shortcut), with `next` = the page asked for.
              const first = await context.request.get(url, { maxRedirects: 0 });
              expect(first.status()).toBe(307);
              const location = new URL(first.headers()["location"]!, baseURL!);
              expect(location.pathname).toBe(`/${locale}/sign-in`);
              expect(location.searchParams.get("next")).toBe(url);
              // And a browser lands on the sign-in page of the same language.
              await page.goto(url);
              expect(new URL(page.url()).pathname).toBe(`/${locale}/sign-in`);
              expect(new URL(page.url()).searchParams.get("next")).toBe(url);
              return;
            }

            const response = await page.goto(url);
            expect(response?.status(), url).toBe(status);
            expect(new URL(page.url()).pathname, "no redirect").toBe(url);
            if (status === 404) {
              // A Client learns nothing about the admin area: the 404 is the site's, not an admin screen.
              await expect(page.locator("[data-admin-shell]")).toHaveCount(0);
              await expect(
                page.getByRole("heading", { level: 1 }),
              ).toBeVisible();
            }
          });
        }
      }
    }
  });
}

test.describe("a session cookie is not a session", () => {
  for (const path of ["/ru/account", "/en/admin"]) {
    test(`a made-up cookie passes the middleware shortcut but not the guard (${path})`, async ({
      page,
      context,
      baseURL,
    }) => {
      // The middleware only checks that a cookie is present (it is not a security boundary); the guard asks the database.
      await context.addCookies([
        {
          name: "stone.session_token",
          value: "forged-token.forged-signature",
          url: baseURL!,
        },
      ]);
      await page.goto(path);
      const url = new URL(page.url());
      expect(url.pathname).toBe(`/${path.split("/")[1]}/sign-in`);
      expect(url.searchParams.get("next")).toBe(path);
    });
  }
});
