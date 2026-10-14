import { defineConfig, devices } from "@playwright/test";

// PLAYWRIGHT_BASE_URL targets a deployed preview; otherwise a local `next start` is used.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3000";

// Second `next start` of the SAME build with APP_ENV=production, for the styleguide 404 guard.
// APP_ENV is read per request, so one `pnpm build` serves both servers.
const productionPort = 3001;
const productionBaseURL = `http://localhost:${productionPort}`;

// Tests tagged @production only make sense against the production-mode server.
const PRODUCTION = /@production/;

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
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      grepInvert: PRODUCTION,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    // A deployed preview cannot be restarted in production mode, so this project only exists
    // when Playwright starts its own servers.
    ...(externalBaseURL
      ? []
      : [
          {
            name: "production-guard",
            grep: PRODUCTION,
            use: {
              ...devices["Desktop Chrome"],
              baseURL: productionBaseURL,
            },
          },
        ]),
  ],
  webServer: externalBaseURL
    ? undefined
    : [
        {
          command: "pnpm start",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `pnpm exec next start -p ${productionPort}`,
          url: productionBaseURL,
          env: { APP_ENV: "production" },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
