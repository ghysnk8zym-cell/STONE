import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";
import { gateRoute, NOT_FOUND_SEGMENT } from "@/lib/route-gate";
import { seed } from "@/server/catalog/seed";

const options = { locales: routing.locales };
const gate = (pathname: string) => gateRoute(pathname, options);

describe("route gate", () => {
  it("lets every public page through", () => {
    for (const path of [
      "/ru",
      "/en/",
      "/ru/catalog",
      "/ru/create-your-stone",
      "/en/create-your-stone",
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

  it("lets the account pages through in both locales (the page guard decides who may see them)", () => {
    for (const locale of ["ru", "en"]) {
      for (const page of [
        "account",
        "account/orders",
        "account/favorites",
        "account/profile",
      ]) {
        expect(gate(`/${locale}/${page}`), `/${locale}/${page}`).toEqual({
          action: "next",
        });
      }
    }
    for (const path of [
      "/ru/account/x",
      "/ru/Account",
      "/en/account/orders/D-1",
      "/en/account/orders/t-2001",
      "/en/account/orders/T-2001/x",
      "/en/account/orders/T%2D2001x",
    ]) {
      expect(gate(path), path).toMatchObject({ action: "not-found" });
    }
  });

  it("lets the cart, the checkout and one order (by number) through", () => {
    for (const locale of ["ru", "en"]) {
      for (const page of [
        "cart",
        "checkout",
        "account/orders/T-2001",
        "account/orders/D-1048",
      ]) {
        expect(gate(`/${locale}/${page}`), page).toEqual({ action: "next" });
      }
    }
    for (const path of ["/ru/cart/x", "/ru/Cart", "/en/checkout/now"]) {
      expect(gate(path), path).toMatchObject({ action: "not-found" });
    }
  });

  it("leaves paths without a locale to the i18n middleware", () => {
    for (const path of ["/", "/de", "/RU/catalog", "/xx/catalog/nope"]) {
      expect(gate(path), path).toEqual({ action: "next" });
    }
  });

  it("lets a lowercase slug of the right shape reach the product route, whatever the catalog holds", () => {
    // Whether the product exists is the route's call (the catalog is in the database).
    for (const path of [
      "/ru/catalog/black-marble",
      "/en/catalog/created-by-an-admin",
      "/ru/catalog/nope",
      "/ru/catalog/stone-2",
    ]) {
      expect(gate(path), path).toEqual({ action: "next" });
    }
  });

  it("redirects a slug in another case or encoding to its lowercase form", () => {
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
    // also for a slug that exists only in the database
    expect(gate("/ru/catalog/Fresh-One")).toEqual({
      action: "redirect",
      pathname: "/ru/catalog/fresh-one",
    });
  });

  it("sends a segment that is not a slug, and deeper or unknown paths, to the localised 404", () => {
    for (const [path, locale] of [
      ["/en/catalog/no.such.stone", "en"],
      ["/ru/catalog/two--dashes", "ru"],
      ["/ru/catalog/-lead", "ru"],
      ["/ru/catalog/with%20space", "ru"],
      ["/en/catalog/%E0%A4%A", "en"],
      ["/en/catalog/black-marble/extra", "en"],
      ["/ru/foo", "ru"],
      ["/ru/Catalog", "ru"],
      ["/en/_styleguide/x", "en"],
      [`/ru/${NOT_FOUND_SEGMENT}`, "ru"],
    ] as const) {
      expect(gate(path), path).toEqual({ action: "not-found", locale });
    }
  });

  it("lets the admin pages through in both locales (the guards decide who may see them)", () => {
    for (const locale of ["ru", "en"]) {
      for (const page of [
        "admin",
        "admin/orders",
        "admin/products",
        "admin/products/new",
        "admin/products/black-marble",
        "admin/create-your-stone",
        "admin/customers",
        "admin/promotions",
        "admin/site-content",
      ]) {
        expect(gate(`/${locale}/${page}`), `/${locale}/${page}`).toEqual({
          action: "next",
        });
      }
    }
    expect(gate("/ru/admin/products/Black-Marble")).toEqual({
      action: "redirect",
      pathname: "/ru/admin/products/black-marble",
    });
    for (const path of ["/ru/Admin", "/ru/admin/x", "/ru/admin/orders/D-1"]) {
      expect(gate(path), path).toMatchObject({ action: "not-found" });
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
      .map((s) =>
        s === "[slug]" ? seed[0]!.slug : s === "[number]" ? "T-2001" : s,
      )
      .join("/");
    it(`/${segments.join("/")} passes`, () => {
      for (const locale of routing.locales) {
        expect(gate(`/${locale}/${sample}`)).toEqual({ action: "next" });
      }
    });
  }
});
