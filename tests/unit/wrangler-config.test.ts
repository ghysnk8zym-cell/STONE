import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type WranglerConfig = {
  name: string;
  vars: Record<string, string>;
  previews?: { vars?: Record<string, string> };
  build?: { command?: string };
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

  it("keeps the Worker name expected by the dashboard", () => {
    expect(config.name).toBe("stone");
  });
});
