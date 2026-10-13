import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import snapshot from "../../src/styles/tokens/figma-variables.json";

const root = process.cwd();
const tokensDir = join(root, "src", "styles", "tokens");
const globalsCss = readFileSync(
  join(root, "src", "app", "globals.css"),
  "utf8",
);

type Declarations = Record<string, string>;
type Contexts = Record<string, Declarations>;

const MIN_WIDTH_ORDER = ["768", "1024", "1440", "1920"];

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Returns the index just after the "}" that closes the "{" at `open`. */
function closingIndex(src: string, open: number): number {
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  }
  return i;
}

function mediaKey(prelude: string): string {
  const min = /min-width:\s*(\d+)px/.exec(prelude);
  if (min) return min[1];
  const max = /max-width:\s*(\d+)px/.exec(prelude);
  if (max) return `max${max[1]}`;
  return prelude;
}

function declarations(body: string): Declarations {
  const result: Declarations = {};
  for (const part of body.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const prop = part.slice(0, colon).trim();
    if (prop.startsWith("--")) result[prop] = part.slice(colon + 1).trim();
  }
  return result;
}

function parseInto(src: string, context: string, out: Contexts): void {
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open === -1) break;
    const prelude = src.slice(i, open).trim();
    const end = closingIndex(src, open);
    const inner = src.slice(open + 1, end - 1);
    if (prelude.startsWith("@media")) {
      parseInto(inner, mediaKey(prelude.replace("@media", "").trim()), out);
    } else if (prelude === ":root") {
      out[context] = { ...out[context], ...declarations(inner) };
    }
    i = end;
  }
}

function parseTokenCss(): Contexts {
  const out: Contexts = {};
  const files = readdirSync(tokensDir).filter((file) => file.endsWith(".css"));
  for (const file of files) {
    parseInto(
      stripComments(readFileSync(join(tokensDir, file), "utf8")),
      "base",
      out,
    );
  }
  return out;
}

function normalise(value: string | number): string {
  const text = typeof value === "number" ? `${value}px` : value;
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Effective value of a variable at a breakpoint after the mobile-first cascade. */
function effective(
  contexts: Contexts,
  name: string,
  breakpoint: string,
): string | undefined {
  let value = contexts.base?.[name];
  if (breakpoint === "max389") {
    return contexts.max389?.[name] ?? value;
  }
  const width = Number(breakpoint);
  for (const min of MIN_WIDTH_ORDER) {
    if (Number(min) <= width && contexts[min]?.[name] !== undefined) {
      value = contexts[min][name];
    }
  }
  return value;
}

function utilityBody(name: string): string | undefined {
  const match = new RegExp(`@utility\\s+${name}\\s*\\{`).exec(globalsCss);
  if (!match) return undefined;
  const open = match.index + match[0].length - 1;
  return globalsCss
    .slice(open + 1, closingIndex(globalsCss, open) - 1)
    .replace(/\s+/g, " ");
}

describe("design tokens", () => {
  const contexts = parseTokenCss();
  const entries = Object.entries(snapshot.variables) as [
    string,
    Record<string, string | number>,
  ][];

  it("snapshot is not empty", () => {
    expect(entries.length).toBeGreaterThan(40);
  });

  it("every snapshot variable is defined in base CSS", () => {
    for (const [name, values] of entries) {
      expect(contexts.base?.[name], `${name} missing in :root`).toBeDefined();
      expect(normalise(contexts.base[name]), name).toBe(normalise(values.base));
    }
  });

  it("breakpoint overrides match the snapshot", () => {
    for (const [name, values] of entries) {
      for (const [breakpoint, expected] of Object.entries(values)) {
        if (breakpoint === "base") continue;
        const actual = effective(contexts, name, breakpoint);
        expect(actual && normalise(actual), `${name} @ ${breakpoint}`).toBe(
          normalise(expected),
        );
      }
    }
  });

  it("media blocks only override snapshot variables, each at a snapshot breakpoint", () => {
    for (const [context, props] of Object.entries(contexts)) {
      if (context === "base" || !/^(max)?\d+$/.test(context)) continue;
      for (const name of Object.keys(props)) {
        const values = snapshot.variables[
          name as keyof typeof snapshot.variables
        ] as Record<string, string | number> | undefined;
        expect(
          values,
          `${name} in @media ${context} is not in the snapshot`,
        ).toBeDefined();
        expect(
          Object.keys(values!),
          `${name} has an override at ${context} but no snapshot value there`,
        ).toContain(context);
      }
    }
  });

  it("letter-spacing percent is converted to em", () => {
    expect(utilityBody("type-brand-logo")).toContain("letter-spacing: 0.1em");
    expect(utilityBody("type-hero-headline")).toContain(
      "letter-spacing: 0.14em",
    );
    expect(utilityBody("type-section-label")).toContain(
      "letter-spacing: 0.12em",
    );
  });

  it("every Figma text style has a matching type-* utility", () => {
    for (const [figmaName, style] of Object.entries(snapshot.textStyles)) {
      const body = utilityBody(style.utility);
      expect(
        body,
        `${figmaName}: utility ${style.utility} missing`,
      ).toBeDefined();
      const size =
        typeof style.size === "number" ? `${style.size}px` : style.size;
      const lineHeight =
        typeof style.lineHeight === "number"
          ? `${style.lineHeight}px`
          : style.lineHeight;
      const letterSpacing =
        style.letterSpacingPercent === 0
          ? "0"
          : `${style.letterSpacingPercent / 100}em`;
      expect(body, `${figmaName} font-size`).toContain(`font-size: ${size}`);
      expect(body, `${figmaName} line-height`).toContain(
        `line-height: ${lineHeight}`,
      );
      expect(body, `${figmaName} letter-spacing`).toContain(
        `letter-spacing: ${letterSpacing}`,
      );
      expect(body, `${figmaName} font-weight`).toContain(
        `font-weight: ${style.weight}`,
      );
      expect(body, `${figmaName} family`).toContain(`"${style.family}"`);
    }
  });

  it("effect variables match the snapshot", () => {
    for (const [effectName, css] of Object.entries(snapshot.effects)) {
      const expected = declarations(css);
      for (const [prop, value] of Object.entries(expected)) {
        expect(contexts.base?.[prop], `${effectName}: ${prop}`).toBeDefined();
        expect(normalise(contexts.base[prop])).toBe(normalise(value));
      }
    }
  });

  it("motion tokens exist", () => {
    for (const prop of [
      "--motion-hover-duration",
      "--motion-hover-ease",
      "--motion-ripple-duration",
      "--motion-ripple-ease",
    ]) {
      expect(contexts.base?.[prop], prop).toBeDefined();
    }
  });
});

describe("globals.css Tailwind wiring", () => {
  it("keeps the Tailwind default palette and fonts reset", () => {
    expect(globalsCss).toMatch(/--color-\*:\s*initial/);
    expect(globalsCss).toMatch(/--font-\*:\s*initial/);
  });

  it("imports tokens before Tailwind", () => {
    const tokens = globalsCss.indexOf("styles/tokens/color.css");
    const tailwind = globalsCss.indexOf('@import "tailwindcss"');
    expect(tokens).toBeGreaterThan(-1);
    expect(tailwind).toBeGreaterThan(tokens);
  });

  it("maps every colour variable through @theme inline", () => {
    const theme =
      /@theme inline\s*\{([\s\S]*?)\n\}/.exec(globalsCss)?.[1] ?? "";
    for (const [name, values] of Object.entries(snapshot.variables)) {
      if (typeof values.base !== "string") continue;
      expect(theme, `${name} not mapped`).toMatch(
        new RegExp(`--color-[a-z0-9-]+:\\s*var\\(${name}\\)`),
      );
    }
  });

  it("defines the hov, focusv and press variants", () => {
    expect(globalsCss).toMatch(/@custom-variant hov /);
    expect(globalsCss).toMatch(/@custom-variant focusv /);
    expect(globalsCss).toMatch(/@custom-variant press /);
    expect(globalsCss).toMatch(/\[data-state="?hover"?\]/);
    expect(globalsCss).toMatch(/\[data-state="?focus"?\]/);
    expect(globalsCss).toMatch(/\[data-state="?pressed"?\]/);
  });

  it("defines glass utilities and a ripple utility that respects reduced motion", () => {
    for (const name of ["glass-panel", "glass-card", "glass-header"]) {
      expect(utilityBody(name), name).toContain("backdrop-filter");
    }
    const ripple = utilityBody("ripple");
    expect(ripple).toBeDefined();
    expect(ripple).toContain("prefers-reduced-motion: reduce");
    expect(ripple).toContain("animation: none");
  });
});
