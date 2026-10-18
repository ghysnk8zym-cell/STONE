import { hasLocale } from "next-intl";
import { z } from "zod";

import { routing, type Locale } from "@/i18n/routing";
import type { ClientAuthResult } from "@/server/auth/next";

import type { AuthErrorCode, AuthFormState, AuthMode } from "./form-state";

/* Parsing of the sign-in / sign-up form fields and mapping of Better Auth failures to codes (used by the actions). */

/** Must match `emailAndPassword` in src/server/auth/auth.ts. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const EMAIL_MAX = 254;

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export type ParsedCredentials =
  | { ok: true; email: string; password: string }
  | { ok: false; state: AuthFormState };

const emailSchema = z.email().max(EMAIL_MAX);

export function parseCredentials(
  data: FormData,
  mode: AuthMode,
): ParsedCredentials {
  const email = field(data, "email").trim();
  const password = field(data, "password");
  const reject = (error: AuthErrorCode): ParsedCredentials => ({
    ok: false,
    state: { error, email },
  });

  if (mode === "sign-in") {
    // One message for every bad credential, however it is malformed: nothing here tells an
    // existing account from a missing one. Short passwords are not refused: they predate the rule.
    const valid =
      emailSchema.safeParse(email).success &&
      password.length > 0 &&
      password.length <= PASSWORD_MAX;
    return valid ? { ok: true, email, password } : reject("invalidCredentials");
  }

  if (!emailSchema.safeParse(email).success) return reject("invalidEmail");
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return reject("weakPassword");
  }
  return { ok: true, email, password };
}

type Failure = Extract<ClientAuthResult, { ok: false }>;

export function errorCodeFor(mode: AuthMode, failure: Failure): AuthErrorCode {
  if (failure.status === 503) return "unavailable";
  if (failure.status === 429) return "tooManyAttempts";

  const code = failure.code ?? "";
  if (mode === "sign-in") {
    // Better Auth answers an unknown email and a wrong password alike (401).
    return failure.status === 401 || failure.status === 400
      ? "invalidCredentials"
      : "generic";
  }
  if (code.startsWith("USER_ALREADY_EXISTS")) return "emailTaken";
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") {
    return "weakPassword";
  }
  if (code === "INVALID_EMAIL") return "invalidEmail";
  return "generic";
}

/** The `locale` hidden field is attacker controlled like any form value: known locales only. */
export function localeFromForm(data: FormData): Locale {
  const value = field(data, "locale");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
