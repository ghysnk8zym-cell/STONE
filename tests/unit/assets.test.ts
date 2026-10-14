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

const PRODUCT_SLUGS = [
  "black-marble",
  "charcoal-ledger",
  "concrete-paver",
  "golden-rock",
  "graphite-rock",
  "graphite-stack",
  "grey-limestone",
  "grey-marble",
  "rustic-split",
  "silver-ledger",
  "split-limestone",
  "taupe-rock",
];
const LOW_RES = [
  "charcoal-ledger",
  "concrete-paver",
  "golden-rock",
  "graphite-rock",
  "rustic-split",
  "silver-ledger",
  "taupe-rock",
];
const WORKS_IDS = [
  "marble-slab", // shared by Marble kitchen countertop and Bathroom cladding
  "natural-stone-fireplace-portal",
];

describe("page assets (Phase 3)", () => {
  const byFile = new Map(manifest.images.map((image) => [image.file, image]));

  // The product gallery reuses images/catalog/<slug> (the Figma main image and the second
  // thumbnail are the same fill; the thumbnail is a CSS crop of it).
  it.each(PRODUCT_SLUGS)("%s catalog image serves the product gallery", (slug) => {
    const first = byFile.get(`images/catalog/${slug}`);
    expect(first, slug).toBeDefined();
    expect(first!.requestedWidths, slug).toContain(1440);
    expect(first!.usage, slug).toContain("ProductGallery:main");
    expect(
      byFile.has(`images/products/${slug}-1`),
      "no duplicate product files",
    ).toBe(false);
    // Never upscaled: the widest output is the widest requested width the source allows.
    const widest = Math.max(
      ...first!.requestedWidths.filter((w) => w <= first!.sourceWidth),
    );
    expect(Math.max(...first!.widths), `${slug}-1 widest`).toBe(widest);
    // Figma sources narrower than 1024 px are low-res; they are listed explicitly so a
    // regression (or a better source later) is noticed.
    if (LOW_RES.includes(slug)) {
      expect(first!.sourceWidth, `${slug}-1 low-res`).toBeLessThan(1024);
    } else {
      expect(first!.sourceWidth, `${slug}-1`).toBeGreaterThanOrEqual(1024);
    }
  });

  it.each(WORKS_IDS)("works/%s exists", (id) => {
    const image = byFile.get(`images/works/${id}`);
    expect(image, id).toBeDefined();
    expect(image!.widths.length, id).toBeGreaterThan(0);
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
