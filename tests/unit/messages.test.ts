import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Tree = { [key: string]: string | Tree };

function load(locale: string): Tree {
  return JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Tree;
}

function leaves(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : leaves(value, path);
  });
}

describe("messages", () => {
  const ru = leaves(load("ru"));
  const en = leaves(load("en"));

  it("ru and en have identical key sets", () => {
    const keys = (entries: [string, string][]) =>
      entries.map(([k]) => k).sort();
    expect(keys(ru)).toEqual(keys(en));
  });

  it.each([
    ["ru", ru],
    ["en", en],
  ])("%s has no empty values", (_locale, entries) => {
    const empty = entries
      .filter(([, value]) => value.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });
});
