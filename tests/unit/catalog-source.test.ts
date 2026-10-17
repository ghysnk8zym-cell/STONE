import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// getServerEnv() and getDb() cache per module instance / globalThis, so every test starts clean.
async function loadCatalog(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
  return import("@/server/catalog");
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { __stoneDb?: unknown }).__stoneDb;
});

describe("getCatalog", () => {
  it("catalog falls back to the static repository without DATABASE_URL", async () => {
    const { getCatalog } = await loadCatalog({ DATABASE_URL: undefined });
    const catalog = await getCatalog();
    expect(await catalog.total()).toBe(12);
    expect((await catalog.getBySlug("black-marble"))?.priceCents).toBe(24000);
  });

  it("serves the database when DATABASE_URL is set", async () => {
    const { getCatalog } = await loadCatalog({
      DATABASE_URL: "pglite://memory",
      BETTER_AUTH_SECRET: "x".repeat(32),
    });
    // The database was never seeded: an empty catalog proves the static data is not used.
    const catalog = await getCatalog();
    expect(await catalog.total()).toBe(0);
    expect(await catalog.getBySlug("black-marble")).toBeNull();
  });
});
