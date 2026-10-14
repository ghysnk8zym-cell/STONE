import { describe, expect, it } from "vitest";

import imageLoader from "@/lib/image-loader";

// images/catalog/black-marble is prepared at 390 / 768 / 1024 (see assets/figma-manifest.json).
const src = "/images/catalog/black-marble";

describe("imageLoader", () => {
  it("picks the smallest width >= requested", () => {
    expect(imageLoader({ src, width: 500 })).toBe(
      "/images/catalog/black-marble-768.webp",
    );
  });

  it("returns an exact match when the width is prepared", () => {
    expect(imageLoader({ src, width: 390 })).toBe(
      "/images/catalog/black-marble-390.webp",
    );
  });

  it("falls back to largest", () => {
    expect(imageLoader({ src, width: 1920 })).toBe(
      "/images/catalog/black-marble-1024.webp",
    );
  });

  it("accepts a manifest key without the leading slash", () => {
    expect(
      imageLoader({ src: "images/catalog/black-marble", width: 500 }),
    ).toBe("/images/catalog/black-marble-768.webp");
  });

  it("throws for unknown src", () => {
    expect(() => imageLoader({ src: "/images/nope", width: 390 })).toThrow(
      "Image not in manifest: /images/nope",
    );
  });
});
