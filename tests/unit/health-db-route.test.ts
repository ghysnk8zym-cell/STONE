import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function callHealth() {
  const { GET } = await import("@/app/api/health/db/route");
  return GET();
}

describe("GET /api/health/db", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { __stoneDb?: unknown }).__stoneDb;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers 503 without a database instead of failing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const response = await callHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "database-not-configured",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers ok after a round trip to the database", async () => {
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
    const response = await callHealth();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers 503 without leaking details when the environment is invalid", async () => {
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", "short");
    const response = await callHealth();
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("short");
    expect(text).not.toContain("pglite");
  });
});
