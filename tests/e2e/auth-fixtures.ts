import { test as base, expect } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";

import en from "../../messages/en.json";

import { uniqueEmail } from "./test-env";

/*
 * Better Auth rate-limits per client IP and path (sign-in 10 / 60 s, sign-up 5 / 60 s; a shared bucket
 * per path would be hit by the parallel tests at once). The e2e server runs behind no proxy, and its
 * client-IP rule takes the last `X-Forwarded-For` hop (src/server/platform/node.ts), so every test gets
 * an address of its own: its buckets never collide with another test's, and the tests that exercise the
 * limit do it on their own address. The address goes out with every browser request (`extraHTTPHeaders`
 * on the context) and is the `clientIp` fixture for direct API calls. Unique per worker (`workerIndex`)
 * and per test in that worker.
 *
 * The second fixture argument is called `provide` (Playwright's docs call it `use`): the React hooks lint
 * rule takes any function called `use(...)` for a hook.
 */
let testsInThisWorker = 0;

export const test = base.extend<{ clientIp: string }>({
  // Playwright reads a fixture's dependencies from the destructured first argument.
  clientIp: async ({}, provide, testInfo) => {
    testsInThisWorker += 1;
    await provide(
      `10.${testInfo.workerIndex % 250}.${Math.floor(testsInThisWorker / 250)}.${testsInThisWorker % 250}`,
    );
  },
  context: async ({ context, clientIp }, provide) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": clientIp });
    await provide(context);
  },
});

export { expect };

/*
 * Signing in and up through the real forms. The Better Auth HTTP API is not exposed (docs/SECURITY.md, `/api/auth/*`
 * answers 404): the browser only ever talks to the server actions, so the tests do the same. The forms work as plain
 * posts before hydration (progressive enhancement), so there is no hydration race. The session cookie lands in the
 * given browser context, like a user's. The context's `x-forwarded-for` (set above, or by the caller) is the rate-limit key.
 */
type Credentials = { email: string; password: string };

async function submitForm(
  context: BrowserContext,
  mode: "signIn" | "signUp",
  credentials: Credentials,
): Promise<{ landedOn: string; page: Page }> {
  const t = en.auth;
  const page = await context.newPage();
  await page.goto(mode === "signIn" ? "/en/sign-in" : "/en/sign-up");
  await page.getByLabel(t.email, { exact: true }).fill(credentials.email);
  await page.getByLabel(t.password, { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: t[mode].submit }).click();
  // Either the redirect to the account page, or the form stays with an error.
  await Promise.race([
    page.waitForURL((url) => !/\/(sign-in|sign-up)$/.test(url.pathname)),
    // (Next's empty route announcer is also an alert, hence the text filter.)
    page.getByRole("alert").filter({ hasText: /\S/ }).waitFor(),
  ]);
  return { landedOn: new URL(page.url()).pathname, page };
}

/** Signs `context` in as an existing user; throws when the form refuses. */
export async function signInInContext(
  context: BrowserContext,
  credentials: Credentials,
): Promise<void> {
  const { landedOn, page } = await submitForm(context, "signIn", credentials);
  await page.close();
  if (/\/(sign-in|sign-up)$/.test(landedOn)) {
    throw new Error("sign-in through the form was refused");
  }
}

/** Whether the form accepts these credentials, in a fresh context (nothing is shared with the caller's browser). */
export async function signInSucceeds(
  browser: Browser,
  baseURL: string,
  clientIp: string,
  credentials: Credentials,
): Promise<boolean> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": clientIp },
  });
  try {
    const { landedOn, page } = await submitForm(context, "signIn", credentials);
    await page.close();
    return !/\/(sign-in|sign-up)$/.test(landedOn);
  } finally {
    await context.close();
  }
}

/** Signs a new account up in `context` (which then holds its session) and returns the address. */
export async function signUpInContext(
  context: BrowserContext,
  password: string,
): Promise<string> {
  const email = uniqueEmail();
  const { landedOn, page } = await submitForm(context, "signUp", {
    email,
    password,
  });
  await page.close();
  if (/\/(sign-in|sign-up)$/.test(landedOn)) {
    throw new Error("sign-up through the form was refused");
  }
  return email;
}

/** Creates an account without leaving a session in the caller's browser (a separate context). */
export async function createAccount(
  browser: Browser,
  baseURL: string,
  clientIp: string,
  password: string,
): Promise<string> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": clientIp },
  });
  try {
    return await signUpInContext(context, password);
  } finally {
    await context.close();
  }
}
