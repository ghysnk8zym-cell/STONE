import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";
import { gateRoute, NOT_FOUND_SEGMENT } from "@/lib/route-gate";
import { seed } from "@/server/catalog/seed";

const options = {
  locales: routing.locales,
  slugs: seed.map((product) => product.slug),
};
const gate = (pathname: string) => gateRoute(pathname, options);

describe("route gate", () => {
  it("lets every public page through", () => {
    for (const path of [
      "/ru",
      "/en/",
      "/ru/catalog",
      "/en/catalog/black-marble",
      "/ru/_styleguide",
    ]) {
      expect(gate(path), path).toEqual({ action: "next" });
    }
  });

  it("lets the sign-up, sign-in and sign-out pages through in both locales", () => {
    for (const locale of ["ru", "en"]) {
      for (const page of ["sign-in", "sign-up", "sign-out"]) {
        expect(gate(`/${locale}/${page}`), `/${locale}/${page}`).toEqual({
          action: "next",
        });
      }
    }
    // Only the exact pages: no sub-paths, no other case.
    for (const path of ["/ru/sign-in/x", "/ru/Sign-In", "/en/sign-out/now"]) {
      expect(gate(path), path).toMatchObject({ action: "not-found" });
    }
  });

  it("leaves paths without a locale to the i18n middleware", () => {
    for (const path of ["/", "/de", "/RU/catalog", "/xx/catalog/nope"]) {
      expect(gate(path), path).toEqual({ action: "next" });
    }
  });

  it("redirects a known slug in another case or encoding to the canonical slug", () => {
    expect(gate("/ru/catalog/Black-Marble")).toEqual({
      action: "redirect",
      pathname: "/ru/catalog/black-marble",
    });
    expect(gate("/en/catalog/GREY-MARBLE")).toEqual({
      action: "redirect",
      pathname: "/en/catalog/grey-marble",
    });
    expect(gate("/ru/catalog/black%2Dmarble")).toEqual({
      action: "redirect",
      pathname: "/ru/catalog/black-marble",
    });
  });

  it("sends unknown slugs and paths to the localised 404", () => {
    for (const [path, locale] of [
      ["/ru/catalog/nope", "ru"],
      ["/ru/catalog/Fresh-One", "ru"],
      ["/en/catalog/black-marble/extra", "en"],
      ["/en/catalog/%E0%A4%A", "en"],
      ["/ru/foo", "ru"],
      ["/ru/Catalog", "ru"],
      ["/en/_styleguide/x", "en"],
      [`/ru/${NOT_FOUND_SEGMENT}`, "ru"],
    ] as const) {
      expect(gate(path), path).toEqual({ action: "not-found", locale });
    }
  });
});

/*
 * Every page under src/app/[locale] must pass the gate, so a new page cannot ship as a 404:
 * add its path to PUBLIC_ROUTES in src/lib/route-gate.ts.
 */
describe("route gate covers the app directory", () => {
  const root = join(process.cwd(), "src", "app", "[locale]");

  function pages(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return pages(full);
      return name === "page.tsx" ? [full] : [];
    });
  }

  const routes = pages(root)
    .map((file) =>
      relative(root, file)
        .split(sep)
        .slice(0, -1)
        .filter((segment) => !/^\(.*\)$/.test(segment))
        .map((segment) => segment.replace(/^%5F/, "_")),
    )
    // the catch-all and the 404 target are not public pages
    .filter(
      (segments) =>
        !segments.some((s) => s.startsWith("[...")) &&
        segments[0] !== NOT_FOUND_SEGMENT,
    );

  it("finds the pages", () => {
    expect(routes.length).toBeGreaterThanOrEqual(4);
  });

  for (const segments of routes) {
    const sample = segments
      .map((s) => (s === "[slug]" ? seed[0]!.slug : s))
      .join("/");
    it(`/${segments.join("/")} passes`, () => {
      for (const locale of routing.locales) {
        expect(gate(`/${locale}/${sample}`)).toEqual({ action: "next" });
      }
    });
  }
});
