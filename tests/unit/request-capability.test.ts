import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { requestSubmissionAvailable } from "@/server/stone-requests/capability";
import { parseServerEnv } from "@/server/env";
describe("request submission deployment capability", () => {
  it.each(["preview", "production"])(
    "%s without a configured origin stays unavailable even with a database",
    (APP_ENV) => {
      const env = parseServerEnv({
        APP_ENV,
        DATABASE_URL: "pglite://memory",
        BETTER_AUTH_SECRET: "test-only-secret-0123456789abcdefgh",
      });
      expect(requestSubmissionAvailable(env)).toBe(false);
      expect(
        requestSubmissionAvailable({
          ...env,
          SITE_URL: "https://demo.example.test",
        }),
      ).toBe(true);
    },
  );
  it("requires a database, including development", () => {
    expect(requestSubmissionAvailable(parseServerEnv({}))).toBe(false);
  });
});
