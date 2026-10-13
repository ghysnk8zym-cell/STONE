import { describe, expect, it, vi } from "vitest";

import { ensureOpenNextBuild } from "../../scripts/ensure-opennext-build.mjs";

describe("ensureOpenNextBuild", () => {
  it("builds when the OpenNext worker is missing (Workers Builds preview)", () => {
    const run = vi.fn();
    ensureOpenNextBuild({ exists: () => false, run });
    expect(run).toHaveBeenCalledWith("pnpm run cf:build");
  });

  it("skips when the worker was already built (production deploy, CI size check)", () => {
    const run = vi.fn();
    ensureOpenNextBuild({ exists: () => true, run });
    expect(run).not.toHaveBeenCalled();
  });
});
