import { test as base, expect } from "@playwright/test";

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
