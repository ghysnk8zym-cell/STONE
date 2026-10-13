import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

import snapshot from "../../src/styles/tokens/figma-variables.json";

type FontOptions = {
  subsets?: string[];
  weight?: string | string[];
  adjustFontFallback?: boolean | string;
  fallback?: string[];
  variable?: string;
};

const calls = vi.hoisted(() => ({}) as Record<string, FontOptions>);

vi.mock("next/font/google", () => {
  const loader = (name: string) => (options: FontOptions) => {
    calls[name] = options;
    return { variable: `${name}-class`, style: {} };
  };
  return {
    Inter: loader("Inter"),
    Lusitana: loader("Lusitana"),
    PT_Serif: loader("PT_Serif"),
  };
});

const typeCss = readFileSync(
  join(process.cwd(), "src", "styles", "tokens", "type.css"),
  "utf8",
);

const globalsCss = readFileSync(
  join(process.cwd(), "src", "app", "globals.css"),
  "utf8",
);

function utilityBody(name: string): string {
  const start = globalsCss.search(
    new RegExp(String.raw`@utility\s+${name}\s*\{`),
  );
  if (start === -1) return "";
  const open = globalsCss.indexOf("{", start);
  return globalsCss.slice(open + 1, globalsCss.indexOf("\n}", open));
}

function tokenValue(name: string): string | undefined {
  return new RegExp(`${name}:\\s*([^;]+);`).exec(typeCss)?.[1].trim();
}

describe("fonts", () => {
  let fontVariables: string;

  beforeAll(async () => {
    ({ fontVariables } = await import("@/app/fonts"));
  });

  it("Lusitana is latin only", () => {
    expect(calls.Lusitana.subsets).toEqual(["latin"]);
    expect(calls.Lusitana.weight).toBe("400");
    expect(calls.Lusitana.variable).toBe("--font-lusitana");
  });

  it("Lusitana emits no unranged local fallback face that would shadow PT Serif", () => {
    // next/font's "Lusitana Fallback" (local Times New Roman, no unicode-range) has Cyrillic
    // on Windows/macOS and would capture it before PT Serif in the display stack.
    expect(calls.Lusitana.adjustFontFallback).toBe(false);
    // Turbopack ignores adjustFontFallback:false; an explicit empty fallback is what removes it.
    expect(calls.Lusitana.fallback).toEqual([]);
  });

  it("PT Serif is cyrillic only", () => {
    expect(calls.PT_Serif.subsets).toEqual(["cyrillic"]);
    expect(calls.PT_Serif.variable).toBe("--font-pt-serif");
  });

  it("Inter includes cyrillic", () => {
    expect(calls.Inter.subsets).toEqual(
      expect.arrayContaining(["latin", "cyrillic"]),
    );
    expect(calls.Inter.variable).toBe("--font-inter");
  });

  it("exposes the three variable classes joined by spaces", () => {
    expect(fontVariables.split(" ").sort()).toEqual([
      "Inter-class",
      "Lusitana-class",
      "PT_Serif-class",
    ]);
  });

  it("display stack puts Lusitana before PT Serif", () => {
    const display = tokenValue("--font-display");
    expect(display).toBeDefined();
    const lusitana = display!.indexOf("var(--font-lusitana)");
    const ptSerif = display!.indexOf("var(--font-pt-serif)");
    expect(lusitana).toBeGreaterThan(-1);
    expect(ptSerif).toBeGreaterThan(lusitana);
    expect(display).toMatch(/serif$/);
  });

  it("body stack uses Inter", () => {
    expect(tokenValue("--font-body")).toBe("var(--font-inter), sans-serif");
  });

  it("type-* utilities read the font stack tokens", () => {
    const styles = Object.values(snapshot.textStyles);
    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) {
      const body = utilityBody(style.utility);
      expect(body, `${style.utility} body`).not.toBe("");
      const token =
        style.family === "Lusitana" ? "--font-display" : "--font-body";
      expect(body, `${style.utility} family`).toContain(
        `font-family: var(${token}`,
      );
    }
  });
});
