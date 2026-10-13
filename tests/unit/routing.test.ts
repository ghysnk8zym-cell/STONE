import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";

describe("locale routing", () => {
  it("supports exactly ru and en", () => {
    expect(routing.locales).toEqual(["ru", "en"]);
  });

  it("defaults to ru", () => {
    expect(routing.defaultLocale).toBe("ru");
  });

  it("always prefixes the locale", () => {
    expect(routing.localePrefix).toBe("always");
  });

  it("does not detect the browser language", () => {
    expect(routing.localeDetection).toBe(false);
  });
});
