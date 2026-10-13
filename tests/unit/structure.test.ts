import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();

const requiredFolders = [
  "docs",
  "src/components",
  "src/features/account",
  "src/features/admin",
  "src/server",
  "src/server/platform",
  "messages",
  "tests",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("repository structure", () => {
  it.each(requiredFolders)("required folder %s exists", (folder) => {
    expect(existsSync(join(root, folder))).toBe(true);
  });

  it.todo("required folder src/app/[locale] exists");
});

describe("portability guard", () => {
  it("no Cloudflare imports outside the platform adapter", () => {
    const platformDir = join(root, "src", "server", "platform") + sep;
    const forbidden =
      /from\s+["'](@opennextjs\/cloudflare[^"']*|wrangler|cloudflare:[^"']+)["']/;
    const offenders = sourceFiles(join(root, "src"))
      .filter((file) => !file.startsWith(platformDir))
      .filter((file) => forbidden.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });
});

describe("platform adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to node", async () => {
    vi.stubEnv("PLATFORM", undefined);
    const { platform } = await import("@/server/platform");
    expect(platform.name).toBe("node");
  });

  it("selects cloudflare when PLATFORM=cloudflare", async () => {
    vi.stubEnv("PLATFORM", "cloudflare");
    const { platform } = await import("@/server/platform");
    expect(platform.name).toBe("cloudflare");
  });
});
