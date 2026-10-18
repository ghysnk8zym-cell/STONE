import { describe, expect, it } from "vitest";

import {
  errorCodeFor,
  localeFromForm,
  parseCredentials,
} from "@/features/auth/credentials";
import { initialAuthFormState } from "@/features/auth/form-state";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseCredentials", () => {
  it("accepts a valid sign-up and trims the email", () => {
    const result = parseCredentials(
      form({ email: "  a@example.test ", password: "long-enough-1" }),
      "sign-up",
    );
    expect(result).toEqual({
      ok: true,
      email: "a@example.test",
      password: "long-enough-1",
    });
  });

  it("sign-up: a malformed email is invalidEmail and keeps what was typed", () => {
    expect(
      parseCredentials(
        form({ email: "not-an-email", password: "long-enough-1" }),
        "sign-up",
      ),
    ).toEqual({
      ok: false,
      state: { error: "invalidEmail", email: "not-an-email" },
    });
  });

  it("sign-up: a short password is weakPassword (min 8)", () => {
    expect(
      parseCredentials(
        form({ email: "a@example.test", password: "1234567" }),
        "sign-up",
      ),
    ).toEqual({
      ok: false,
      state: { error: "weakPassword", email: "a@example.test" },
    });
    expect(
      parseCredentials(
        form({ email: "a@example.test", password: "12345678" }),
        "sign-up",
      ).ok,
    ).toBe(true);
  });

  it("sign-up: a password over 128 characters is weakPassword", () => {
    const result = parseCredentials(
      form({ email: "a@example.test", password: "x".repeat(129) }),
      "sign-up",
    );
    expect(result).toMatchObject({
      ok: false,
      state: { error: "weakPassword" },
    });
  });

  it("sign-in: a malformed email and an empty password are both invalidCredentials", () => {
    for (const fields of [
      { email: "nope", password: "whatever-123" },
      { email: "a@example.test", password: "" },
      { email: "", password: "" },
      { email: "a@example.test", password: "x".repeat(129) },
    ]) {
      expect(
        parseCredentials(form(fields), "sign-in"),
        JSON.stringify(fields),
      ).toMatchObject({ ok: false, state: { error: "invalidCredentials" } });
    }
  });

  it("sign-in: a short password is not rejected locally (accounts predate the rule)", () => {
    expect(
      parseCredentials(
        form({ email: "a@example.test", password: "short" }),
        "sign-in",
      ).ok,
    ).toBe(true);
  });

  it("treats missing or non-string fields as empty", () => {
    const data = new FormData();
    data.set("email", new File(["x"], "x.txt"));
    expect(parseCredentials(data, "sign-up")).toMatchObject({
      ok: false,
      state: { error: "invalidEmail", email: "" },
    });
  });
});

describe("errorCodeFor", () => {
  const fail = (status: number, code?: string) =>
    ({ ok: false, status, ...(code ? { code } : {}) }) as const;

  it("maps Better Auth sign-up failures", () => {
    expect(
      errorCodeFor(
        "sign-up",
        fail(422, "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"),
      ),
    ).toBe("emailTaken");
    expect(errorCodeFor("sign-up", fail(422, "USER_ALREADY_EXISTS"))).toBe(
      "emailTaken",
    );
    expect(errorCodeFor("sign-up", fail(400, "PASSWORD_TOO_SHORT"))).toBe(
      "weakPassword",
    );
    expect(errorCodeFor("sign-up", fail(400, "PASSWORD_TOO_LONG"))).toBe(
      "weakPassword",
    );
    expect(errorCodeFor("sign-up", fail(400, "INVALID_EMAIL"))).toBe(
      "invalidEmail",
    );
    expect(errorCodeFor("sign-up", fail(500))).toBe("generic");
  });

  it("sign-in: unknown email and wrong password give the same answer", () => {
    // Better Auth answers both with 401 INVALID_EMAIL_OR_PASSWORD.
    expect(
      errorCodeFor("sign-in", fail(401, "INVALID_EMAIL_OR_PASSWORD")),
    ).toBe("invalidCredentials");
    expect(errorCodeFor("sign-in", fail(401))).toBe("invalidCredentials");
    expect(errorCodeFor("sign-in", fail(400, "INVALID_EMAIL"))).toBe(
      "invalidCredentials",
    );
  });

  it("rate limiting and a missing database are named for both screens", () => {
    for (const mode of ["sign-in", "sign-up"] as const) {
      expect(errorCodeFor(mode, fail(429))).toBe("tooManyAttempts");
      expect(errorCodeFor(mode, fail(503, "AUTH_UNAVAILABLE"))).toBe(
        "unavailable",
      );
    }
  });
});

describe("localeFromForm", () => {
  it("accepts a known locale and falls back to the default for anything else", () => {
    expect(localeFromForm(form({ locale: "en" }))).toBe("en");
    expect(localeFromForm(form({ locale: "ru" }))).toBe("ru");
    expect(localeFromForm(form({ locale: "de" }))).toBe("ru");
    expect(localeFromForm(form({ locale: "/en/evil" }))).toBe("ru");
    expect(localeFromForm(form({}))).toBe("ru");
  });
});

describe("initial state", () => {
  it("has no error and no email", () => {
    expect(initialAuthFormState).toEqual({ error: null, email: "" });
  });
});
