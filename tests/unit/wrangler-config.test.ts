import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type WranglerConfig = {
  name: string;
  vars: Record<string, string>;
  previews?: { vars?: Record<string, string> };
  build?: { command?: string };
  preview_urls?: boolean;
  workers_dev?: boolean;
};

function readJsonc(path: string): WranglerConfig {
  const text = readFileSync(path, "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(text) as WranglerConfig;
}

describe("wrangler.jsonc", () => {
  const config = readJsonc("wrangler.jsonc");

  // Workers Builds runs `wrangler preview` for non-production branches; it refuses to run
  // without a `previews` block because vars are not inherited from the top level.
  it("defines preview vars equal to the top-level vars", () => {
    expect(config.previews?.vars).toEqual(config.vars);
  });

  // Workers Builds skips the dashboard build command for preview builds, so wrangler itself
  // must produce .open-next/worker.js before `wrangler preview` uploads it.
  it("lets wrangler build the OpenNext worker when it is missing", () => {
    expect(config.build?.command).toBe(
      "node scripts/ensure-opennext-build.mjs",
    );
  });

  // Without this, `wrangler preview` uploads the Preview but it has no URL to test.
  it("serves Previews on workers.dev URLs", () => {
    expect(config.preview_urls).toBe(true);
    expect(config.workers_dev).toBe(true);
  });

  it("keeps the Worker name expected by the dashboard", () => {
    expect(config.name).toBe("stone");
  });

  // The customer-review test shop is a separate Worker, deployed by hand from a CI-built artifact
  // (`wrangler deploy --env test`), so it never touches the Git-connected `stone` Worker.
  describe("env.test (customer-review test shop)", () => {
    const test = (config as WranglerConfig & { env?: Record<string, TestEnv> })
      .env?.test;

    it("is its own Worker on workers.dev without preview URLs", () => {
      expect(test?.name).toBe("stone-test");
      expect(test?.workers_dev).toBe(true);
      expect(test?.preview_urls).toBe(false);
    });

    it("keeps the site noindex and names its exact public origin", () => {
      expect(test?.vars).toMatchObject({
        PLATFORM: "cloudflare",
        APP_ENV: "preview",
        INDEXING: "off",
        BETTER_AUTH_URL: "https://stone-test.gb8cj746n2.workers.dev",
        SITE_URL: "https://stone-test.gb8cj746n2.workers.dev",
      });
    });

    it("never carries a secret in the file", () => {
      const keys = Object.keys(test?.vars ?? {});
      expect(keys).not.toContain("DATABASE_URL");
      expect(keys).not.toContain("BETTER_AUTH_SECRET");
    });

    it("references itself, not the production Worker", () => {
      expect(test?.services).toEqual([
        { binding: "WORKER_SELF_REFERENCE", service: "stone-test" },
      ]);
    });
  });
});

type TestEnv = {
  name: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  vars?: Record<string, string>;
  services?: { binding: string; service: string }[];
};
