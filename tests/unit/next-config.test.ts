import { readFileSync } from "node:fs";
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

// Phase 4a security audit F3 / F11: a baseline of response headers on every response, from next.config.ts, and the same
// ones for the static files that bypass Next (public/_headers, Cloudflare and Netlify). There is no script-src on
// purpose (see docs/SECURITY.md): Next's inline bootstrap scripts need a nonce setup that is deferred.
describe("next.config security headers", () => {
  const EXPECTED = {
    "Content-Security-Policy":
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function headersOf(indexing: string | undefined) {
    vi.stubEnv("INDEXING", indexing);
    const { default: config } = await import("../../next.config");
    const rules = await config.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0]!.source).toBe("/:path*");
    return Object.fromEntries(rules[0]!.headers.map((h) => [h.key, h.value]));
  }

  it("sends the baseline on every response, together with the noindex header while the site is not indexed", async () => {
    expect(await headersOf(undefined)).toEqual({
      "X-Robots-Tag": "noindex, nofollow",
      ...EXPECTED,
    });
  });

  it("keeps the baseline when indexing is on", async () => {
    expect(await headersOf("on")).toEqual(EXPECTED);
  });

  it("does not advertise the framework (X-Powered-By)", async () => {
    const { default: config } = await import("../../next.config");
    expect(config.poweredByHeader).toBe(false);
  });

  it("public/_headers repeats the baseline for files served outside Next", () => {
    const file = readFileSync("public/_headers", "utf8");
    const block = file.split(/\n(?=\S)/).find((b) => b.startsWith("/*"))!;
    for (const [key, value] of Object.entries(EXPECTED)) {
      expect(block, key).toContain(`  ${key}: ${value}`);
    }
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
