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

  it(".env.example lists every server env key", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const key of SERVER_ENV_KEYS) {
      expect(example).toMatch(new RegExp(`^${key}=`, "m"));
    }
  });
});
