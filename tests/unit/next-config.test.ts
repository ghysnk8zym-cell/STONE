import { afterEach, describe, expect, it, vi } from "vitest";

// robots.txt may be rendered at runtime on some hosts (e.g. OpenNext without an
// incremental cache) while headers come from the build. Inlining INDEXING at build
// time keeps both decisions identical on every platform.
describe("next.config indexing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("inlines INDEXING=off when unset at build time", async () => {
    vi.stubEnv("INDEXING", undefined);
    const { default: config } = await import("../../next.config");
    expect(config.env?.INDEXING).toBe("off");
  });

  it("inlines INDEXING=on only when set to on at build time", async () => {
    vi.stubEnv("INDEXING", "on");
    const { default: config } = await import("../../next.config");
    expect(config.env?.INDEXING).toBe("on");
  });
});
