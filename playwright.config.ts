import { defineConfig, devices } from "@playwright/test";

// PLAYWRIGHT_BASE_URL targets a deployed preview; otherwise a local `next start` is used.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3000";

// Second `next start` of the SAME build with APP_ENV=production, for the styleguide 404 guard.
// APP_ENV is read per request, so one `pnpm build` serves all the servers.
const productionPort = 3001;
const productionBaseURL = `http://localhost:${productionPort}`;

// Third `next start` of the same build, WITH a database: a throwaway PGlite database, migrated and seeded
// by scripts/e2e-db-server.mjs with the fake values of .env.test.example. Only the `auth-*` projects
// (the sign-up / sign-in / sign-out flows, tests/e2e/auth.spec.ts, and the account area and favourites,
// tests/e2e/account.spec.ts) use it. The two servers above have no
// database (DATABASE_URL is forced empty, so a developer's .env.local cannot switch one on), as the
// preview does until the owner adds Neon: the Phase 3 tests and the "unavailable" tests run there.
const authPort = 3002;
const authBaseURL = `http://localhost:${authPort}`;
// Anchored: only files named exactly `auth.spec.ts` or `account.spec.ts` (not `oauth.spec.ts`) belong to the
// database server. A new spec that needs the database is added here on purpose.
const AUTH_SPEC = /(^|[\\/])(auth|account)\.spec\.ts$/;
const NO_DATABASE = { DATABASE_URL: "", BETTER_AUTH_SECRET: "" };

// Tests tagged @production only make sense against the production-mode server.
const PRODUCTION = /@production/;

const DESKTOP = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
};
const MOBILE = {
  ...devices["Desktop Chrome"],
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      grepInvert: PRODUCTION,
      testIgnore: AUTH_SPEC,
      use: DESKTOP,
    },
    {
      name: "mobile",
      grepInvert: PRODUCTION,
      testIgnore: AUTH_SPEC,
      use: MOBILE,
    },
    // A deployed preview cannot be restarted in production mode or with a database, so these projects
    // only exist when Playwright starts its own servers.
    ...(externalBaseURL
      ? []
      : [
          {
            name: "production-guard",
            grep: PRODUCTION,
            testIgnore: AUTH_SPEC,
            use: {
              ...devices["Desktop Chrome"],
              baseURL: productionBaseURL,
            },
          },
          {
            name: "auth-desktop",
            testMatch: AUTH_SPEC,
            use: { ...DESKTOP, baseURL: authBaseURL },
          },
          {
            name: "auth-mobile",
            testMatch: AUTH_SPEC,
            use: { ...MOBILE, baseURL: authBaseURL },
          },
        ]),
  ],
  webServer: externalBaseURL
    ? undefined
    : [
        {
          command: "pnpm start",
          url: baseURL,
          env: NO_DATABASE,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `pnpm exec next start -p ${productionPort}`,
          url: productionBaseURL,
          env: { APP_ENV: "production", ...NO_DATABASE },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          // Migrates and seeds a fresh PGlite directory, then starts `next start` (see the script).
          command:
            "node --env-file=.env.test.example scripts/e2e-db-server.mjs",
          url: authBaseURL,
          env: { E2E_PORT: String(authPort) },
          // Lets the script delete its temp database (POSIX; on Windows the script's start-up sweep does).
          gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
});
