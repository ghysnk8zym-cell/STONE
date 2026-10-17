import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseServerEnv, SERVER_ENV_KEYS } = await import("@/server/env");

describe("server env", () => {
  it("defaults to noindex when INDEXING is unset", () => {
    expect(parseServerEnv({}).INDEXING).toBe("off");
  });

  it("defaults APP_ENV to development and PLATFORM to node", () => {
    const env = parseServerEnv({});
    expect(env.APP_ENV).toBe("development");
    expect(env.PLATFORM).toBe("node");
  });

  it("rejects invalid INDEXING with the variable name but not its value", () => {
    let message = "";
    try {
      parseServerEnv({ INDEXING: "secret-xyz" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("INDEXING");
    expect(message).not.toContain("secret-xyz");
  });

  it("treats empty SITE_URL as unset (copied .env.example works)", () => {
    expect(parseServerEnv({ SITE_URL: "" }).SITE_URL).toBeUndefined();
  });

  describe("database and auth keys", () => {
    const secret = "x".repeat(32);

    it("are all optional (the site runs without a database)", () => {
      const env = parseServerEnv({});
      expect(env.DATABASE_URL).toBeUndefined();
      expect(env.BETTER_AUTH_SECRET).toBeUndefined();
      expect(env.BETTER_AUTH_URL).toBeUndefined();
      expect(env.SEED_ADMIN_EMAIL).toBeUndefined();
      expect(env.SEED_ADMIN_PASSWORD).toBeUndefined();
      expect(env.SEED_CLIENT_EMAIL).toBeUndefined();
      expect(env.SEED_CLIENT_PASSWORD).toBeUndefined();
    });

    it("treat empty values (a copied .env.example) as unset", () => {
      const env = parseServerEnv({
        DATABASE_URL: "",
        BETTER_AUTH_SECRET: "",
        BETTER_AUTH_URL: "",
        SEED_ADMIN_EMAIL: "",
        SEED_ADMIN_PASSWORD: "",
        SEED_CLIENT_EMAIL: "",
        SEED_CLIENT_PASSWORD: "",
      });
      expect(env.DATABASE_URL).toBeUndefined();
      expect(env.BETTER_AUTH_SECRET).toBeUndefined();
      expect(env.SEED_ADMIN_EMAIL).toBeUndefined();
    });

    it("require BETTER_AUTH_SECRET of at least 32 characters when DATABASE_URL is set", () => {
      expect(() => parseServerEnv({ DATABASE_URL: "pglite://memory" })).toThrow(
        "BETTER_AUTH_SECRET",
      );
      expect(() =>
        parseServerEnv({
          DATABASE_URL: "pglite://memory",
          BETTER_AUTH_SECRET: "x".repeat(31),
        }),
      ).toThrow("BETTER_AUTH_SECRET");
      expect(
        parseServerEnv({
          DATABASE_URL: "pglite://memory",
          BETTER_AUTH_SECRET: secret,
        }).DATABASE_URL,
      ).toBe("pglite://memory");
    });

    it("accept postgres, postgresql and pglite URLs only", () => {
      for (const url of [
        "postgres://u:p@localhost/db",
        "postgresql://u:p@localhost/db",
        "pglite://memory",
      ]) {
        expect(() =>
          parseServerEnv({ DATABASE_URL: url, BETTER_AUTH_SECRET: secret }),
        ).not.toThrow();
      }
      expect(() =>
        parseServerEnv({
          DATABASE_URL: "mysql://u:p@localhost/db",
          BETTER_AUTH_SECRET: secret,
        }),
      ).toThrow("DATABASE_URL");
    });

    it("validate BETTER_AUTH_URL and the seed values", () => {
      expect(() => parseServerEnv({ BETTER_AUTH_URL: "not a url" })).toThrow(
        "BETTER_AUTH_URL",
      );
      expect(() => parseServerEnv({ SEED_ADMIN_EMAIL: "nope" })).toThrow(
        "SEED_ADMIN_EMAIL",
      );
      expect(() => parseServerEnv({ SEED_CLIENT_PASSWORD: "short" })).toThrow(
        "SEED_CLIENT_PASSWORD",
      );
    });

    it("never put secret values in the error message", () => {
      let message = "";
      try {
        parseServerEnv({
          DATABASE_URL: "postgres://user:hunter2pass@localhost/db",
          BETTER_AUTH_SECRET: "tooshort-secret-value",
          SEED_CLIENT_PASSWORD: "pw",
        });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain("BETTER_AUTH_SECRET");
      expect(message).not.toContain("hunter2pass");
      expect(message).not.toContain("tooshort-secret-value");
    });
  });

  it(".env.example keeps secret and seed keys empty", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const key of [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "SEED_ADMIN_EMAIL",
      "SEED_ADMIN_PASSWORD",
      "SEED_CLIENT_EMAIL",
      "SEED_CLIENT_PASSWORD",
    ]) {
      expect(example).toMatch(new RegExp(`^${key}=$`, "m"));
    }
  });

  it(".env.example lists every server env key", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const key of SERVER_ENV_KEYS) {
      expect(example).toMatch(new RegExp(`^${key}=`, "m"));
    }
  });
});
