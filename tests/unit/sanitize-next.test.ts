import { describe, expect, it } from "vitest";

import { sanitizeNext } from "@/lib/safe-next";

const FALLBACK_RU = "/ru/account";

describe("sanitizeNext rejects external targets", () => {
  it.each([
    "//evil.com",
    "//evil.com/ru/account",
    "https://evil.com",
    "https://evil.com/ru/account",
    "http:evil.com",
    "https:evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/ru/\\..\\..\\evil.com",
    "%2F%2Fevil.com",
    "/%2F%2Fevil.com",
    "/ru/%2F%2Fevil.com",
    "/ru/%5Cevil.com",
    "/ru/..//evil.com",
    "/ru/%2e%2e//evil.com",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,hi",
    " /ru/catalog",
    "/ru/cat\talog",
    "/\t/evil.com",
    "/\n/evil.com",
    "/ru/catalog\u0000",
    "/ru/catalog\r\nSet-Cookie: x=1",
    "/ru/%00",
    "ru/catalog",
    "",
  ])("%j falls back to the account page", (value) => {
    expect(sanitizeNext(value, "ru")).toBe(FALLBACK_RU);
  });

  it("falls back for values that are not strings", () => {
    for (const value of [undefined, null, 42, ["/ru/catalog"], {}]) {
      expect(sanitizeNext(value, "ru")).toBe(FALLBACK_RU);
    }
  });

  it("falls back for overly long values", () => {
    expect(sanitizeNext(`/ru/catalog?q=${"x".repeat(3000)}`, "ru")).toBe(
      FALLBACK_RU,
    );
  });

  it("falls back for a path in another locale or outside the locale", () => {
    expect(sanitizeNext("/en/catalog", "ru")).toBe(FALLBACK_RU);
    expect(sanitizeNext("/api/auth/sign-out", "ru")).toBe(FALLBACK_RU);
    expect(sanitizeNext("/rus/catalog", "ru")).toBe(FALLBACK_RU);
  });

  it("never returns a sign-in or sign-up page (no redirect loop)", () => {
    expect(sanitizeNext("/ru/sign-in?next=%2Fru%2Faccount", "ru")).toBe(
      FALLBACK_RU,
    );
    expect(sanitizeNext("/en/sign-up", "en")).toBe("/en/account");
  });

  it("uses the requested locale for the fallback and the default locale for an unknown one", () => {
    expect(sanitizeNext("//evil.com", "en")).toBe("/en/account");
    expect(sanitizeNext("//evil.com", "xx")).toBe("/ru/account");
    expect(sanitizeNext("/ru/catalog", "xx")).toBe("/ru/catalog");
  });
});

describe("sanitizeNext accepts internal paths", () => {
  it.each([
    ["/ru/catalog?q=x", "/ru/catalog?q=x"],
    ["/ru/catalog/black-marble", "/ru/catalog/black-marble"],
    ["/en/account/orders", "/en/account/orders"],
    [
      "/en/admin/products?page=2&sort=name",
      "/en/admin/products?page=2&sort=name",
    ],
    [
      "/ru/catalog?q=%D0%BC%D1%80%D0%B0%D0%BC%D0%BE%D1%80",
      "/ru/catalog?q=%D0%BC%D1%80%D0%B0%D0%BC%D0%BE%D1%80",
    ],
    ["/ru/catalog?next=https://evil.com", "/ru/catalog?next=https://evil.com"],
    ["/ru/catalog#top", "/ru/catalog"],
    ["/ru", "/ru/"],
    ["/ru?x=1", "/ru/?x=1"],
  ])("%j -> %j", (value, expected) => {
    const locale = value.startsWith("/en") ? "en" : "ru";
    const result = sanitizeNext(value, locale);
    expect(result).toBe(expected);
    expect(result.startsWith(`/${locale}/`)).toBe(true);
  });

  it("returns a value that resolves to the same origin", () => {
    for (const value of ["/ru/catalog?q=x", "//evil.com", "/\\evil.com"]) {
      const base = "https://stone.example";
      expect(new URL(sanitizeNext(value, "ru"), base).origin).toBe(base);
    }
  });
});
