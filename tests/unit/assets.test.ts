import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "../../assets/figma-manifest.json";

const root = process.cwd();
const MAX_BYTES = 1024 * 1024;

const outputs = manifest.images.flatMap((image) =>
  image.widths.map((width) => `${image.file}-${width}.webp`),
);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("image assets", () => {
  it("lists at least one image with prepared widths", () => {
    expect(manifest.images.length).toBeGreaterThan(0);
    for (const image of manifest.images) {
      expect(image.widths.length, image.file).toBeGreaterThan(0);
    }
  });

  it("every manifest output exists and is non-empty", () => {
    for (const output of outputs) {
      const path = join(root, "public", output);
      expect(existsSync(path), output).toBe(true);
      expect(statSync(path).size, output).toBeGreaterThan(0);
    }
  });

  it("no image exceeds 1 MB", () => {
    const files = walk(join(root, "public", "images"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(statSync(file).size, file).toBeLessThanOrEqual(MAX_BYTES);
    }
  });

  it("every Figma icon in the manifest exists", () => {
    for (const icon of manifest.icons) {
      const path = join(root, "public", "icons", `${icon.name}.svg`);
      expect(existsSync(path), icon.name).toBe(true);
      expect(statSync(path).size, icon.name).toBeGreaterThan(0);
    }
  });
});

describe("source hygiene", () => {
  it("no source file contains figma.com/api/mcp/asset", () => {
    const offenders = walk(join(root, "src")).filter((file) =>
      readFileSync(file, "utf8").includes("figma.com/api/mcp/asset"),
    );
    expect(offenders).toEqual([]);
  });
});
