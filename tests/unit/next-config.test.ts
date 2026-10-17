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

// Workers cannot bundle pg and must not ship PGlite (~20 MB of WebAssembly): the OpenNext
// build aliases the Node-only drivers to a stub, every other build keeps them.
describe("next.config database drivers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps pg and PGlite on regular builds", async () => {
    vi.stubEnv("STONE_BUILD_TARGET", undefined);
    const { default: config } = await import("../../next.config");
    expect(config.turbopack?.resolveAlias).not.toHaveProperty("pg");
    expect(config.serverExternalPackages).toContain("@electric-sql/pglite");
  });

  it("aliases the Node-only drivers out of the Worker build", async () => {
    vi.stubEnv("STONE_BUILD_TARGET", "cloudflare");
    const { default: config } = await import("../../next.config");
    const aliases = config.turbopack?.resolveAlias ?? {};
    for (const id of [
      "pg",
      "@electric-sql/pglite",
      "drizzle-orm/node-postgres",
      "drizzle-orm/pglite",
      "drizzle-orm/pglite/migrator",
    ]) {
      expect(aliases[id]).toBe("./src/server/db/unavailable-driver.ts");
    }
    expect(aliases["@neondatabase/serverless"]).toBeUndefined();
    expect(config.serverExternalPackages).not.toContain("@electric-sql/pglite");
  });

  it("open-next.config marks the build as the Worker target", async () => {
    vi.stubEnv("STONE_BUILD_TARGET", undefined);
    await import("../../open-next.config");
    expect(process.env.STONE_BUILD_TARGET).toBe("cloudflare");
    delete process.env.STONE_BUILD_TARGET;
  });
});
