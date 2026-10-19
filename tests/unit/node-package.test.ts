import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertNoBuildEnvFiles,
  nodeBuildEnv,
} from "../../scripts/build-node.mjs";
import {
  assertInternalLinks,
  copyNodeRuntime,
  normalizeStandaloneLinks,
} from "../../scripts/copy-node-runtime.mjs";

describe("standalone build isolation", () => {
  it("repoints traced dependency links and relocates without using the original dependency tree", () => {
    const root = mkdtempSync(join(tmpdir(), "stone-node-links-"));
    const build = join(root, "build");
    const output = join(build, ".next", "standalone");
    const relativePackage = join(
      "node_modules",
      ".pnpm",
      "demo",
      "node_modules",
      "demo",
    );
    for (const base of [build, output]) {
      mkdirSync(join(base, relativePackage), { recursive: true });
      writeFileSync(
        join(base, relativePackage, "index.js"),
        base === build ? "source" : "traced",
      );
    }
    symlinkSync(
      join(build, relativePackage),
      join(output, "node_modules", "demo"),
      "junction",
    );
    expect(() => assertInternalLinks(output)).toThrow("external");
    expect(normalizeStandaloneLinks(output, build)).toBe(1);
    const destination = join(root, "runtime");
    expect(copyNodeRuntime(output, destination)).toEqual({ links: 1 });
    expect(realpathSync(join(destination, "node_modules", "demo"))).toBe(
      realpathSync(join(destination, relativePackage)),
    );
    expect(
      readFileSync(
        join(destination, "node_modules", "demo", "index.js"),
        "utf8",
      ),
    ).toBe("traced");
    expect(() => copyNodeRuntime(output, destination)).toThrow(
      "new runtime directory",
    );
    const alias = join(root, "artifact-alias");
    symlinkSync(output, alias, "junction");
    expect(() =>
      copyNodeRuntime(output, join(alias, "recursive-copy")),
    ).toThrow("new runtime directory");
    expect(existsSync(join(output, "recursive-copy"))).toBe(false);
    if (process.platform === "win32") {
      const absentDrive = [..."ZYXWVUTSRQPONMLKJIHGFEDBA"].find(
        (letter) => !existsSync(`${letter}:\\`),
      );
      if (absentDrive)
        expect(() =>
          copyNodeRuntime(output, `${absentDrive}:\\stone-runtime`),
        ).toThrow("no accessible filesystem root");
    }
  });
  it("refuses env files before Next can copy them, while allowing public examples", () => {
    const root = mkdtempSync(join(tmpdir(), "stone-node-package-"));
    writeFileSync(join(root, ".env.example"), "DATABASE_URL=\n");
    writeFileSync(join(root, ".env.test.example"), "TEST_ONLY=example\n");
    expect(() => assertNoBuildEnvFiles(root)).not.toThrow();
    writeFileSync(
      join(root, ".env.local"),
      "DATABASE_URL=private-placeholder\n",
    );
    expect(() => assertNoBuildEnvFiles(root)).toThrow("clean source copy");
  });

  it("builds without inherited runtime credentials or remote seed permission", () => {
    const result = nodeBuildEnv({
      DATABASE_URL: "private-placeholder",
      BETTER_AUTH_SECRET: "private-placeholder",
      SEED_ADMIN_PASSWORD: "private-placeholder",
      SEED_ALLOW_REMOTE: "1",
      PLATFORM: "cloudflare",
      INDEXING: "off",
    });
    expect(result.DATABASE_URL).toBe("");
    expect(result.BETTER_AUTH_SECRET).toBe("");
    expect(result.SEED_ADMIN_PASSWORD).toBe("");
    expect(result.SEED_ALLOW_REMOTE).toBe("");
    expect(result.PLATFORM).toBe("node");
    expect(result.STONE_BUILD_TARGET).toBe("node-standalone");
    expect(result.INDEXING).toBe("off");
  });
});
