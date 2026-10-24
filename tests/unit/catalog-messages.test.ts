import { describe, expect, it } from "vitest";

import { seed } from "@/server/catalog/seed";
import {
  COLOR_GROUPS,
  COLORS,
  FINISHES,
  MATERIALS,
} from "@/server/catalog/types";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

type Tree = { [key: string]: string | Tree };

function get(tree: Tree, path: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === undefined) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

const paths = [
  ...seed.flatMap((p) => [
    `catalog.products.${p.slug}.name`,
    `catalog.products.${p.slug}.description`,
  ]),
  ...MATERIALS.map((m) => `catalog.material.${m}`),
  ...COLOR_GROUPS.map((c) => `catalog.colorGroup.${c}`),
  ...COLORS.map((c) => `catalog.color.${c}`),
  ...FINISHES.map((f) => `catalog.finish.${f}`),
];

describe("catalog messages", () => {
  it.each([
    ["en", en],
    ["ru", ru],
  ])(
    "%s empty results do not invent a selected material or colour",
    (_locale, messages) => {
      expect((messages as typeof en).pages.catalog.empty.body).not.toMatch(
        /this color|selected material|этого цвета|выбранном материале/i,
      );
    },
  );
  it.each([
    ["en", en],
    ["ru", ru],
  ])(
    "every seed product, material, colour group, colour and finish has %s copy",
    (_locale, messages) => {
      const missing = paths.filter((p) => !get(messages as Tree, p)?.trim());
      expect(missing).toEqual([]);
    },
  );

  it("ru product names differ from en names", () => {
    for (const p of seed) {
      expect(get(ru as Tree, `catalog.products.${p.slug}.name`)).not.toBe(
        get(en as Tree, `catalog.products.${p.slug}.name`),
      );
    }
  });

  it("uses ICU arguments for the result counter and calculator range", () => {
    for (const messages of [en, ru] as Tree[]) {
      const showing = get(messages, "pages.catalog.showing");
      expect(showing).toContain("{shown}");
      expect(showing).toContain("{total}");
      const range = get(messages, "pages.product.calculator.error.range");
      expect(range).toContain("{min}");
      expect(range).toContain("{max}");
    }
  });
});
