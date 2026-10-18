"use server";

import { redirect } from "next/navigation";

import {
  errorCodeFor,
  localeFromForm,
  parseCredentials,
} from "@/features/auth/credentials";
import type { AuthFormState, AuthMode } from "@/features/auth/form-state";
import { sanitizeNext } from "@/lib/safe-next";
import { callAuthEndpoint, toClientResult } from "@/server/auth/next";

/*
 * Sign-up, sign-in and sign-out (Phase 4a Task 3). Public actions: they are how a Guest becomes a
 * user, so none calls `requireUser`. They work as plain form posts without JavaScript (progressive
 * enhancement) and return only an AuthFormState: a code and the typed email, never Better Auth's
 * response (it holds the session token). Every call goes through `callAuthEndpoint`, i.e. the
 * Better Auth handler, so the rate limit and the origin check apply (docs/SECURITY.md).
 */

async function authenticate(
  mode: AuthMode,
  data: FormData,
): Promise<AuthFormState> {
  const locale = localeFromForm(data);
  const parsed = parseCredentials(data, mode);
  if (!parsed.ok) return parsed.state;

  const { email, password } = parsed;
  const result = toClientResult(
    mode === "sign-in"
      ? await callAuthEndpoint("/sign-in/email", { email, password })
      : // Better Auth requires a name; an empty one means "show the email's local part".
        await callAuthEndpoint("/sign-up/email", { email, password, name: "" }),
  );
  if (!result.ok) return { error: errorCodeFor(mode, result), email };

  // Outside any try/catch: redirect() works by throwing. `next` is attacker controlled, so it is
  // sanitised to an internal path of this locale (the account page otherwise).
  redirect(sanitizeNext(data.get("next"), locale));
}

export async function signUpAction(
  _previous: AuthFormState,
  data: FormData,
): Promise<AuthFormState> {
  return authenticate("sign-up", data);
}

export async function signInAction(
  _previous: AuthFormState,
  data: FormData,
): Promise<AuthFormState> {
  return authenticate("sign-in", data);
}

/** Ends the session on the server (row deleted, cookie cleared), then goes to the home page. */
export async function signOutAction(data: FormData): Promise<void> {
  const locale = localeFromForm(data);
  // A Guest has nothing to end; a missing database has no sessions. Either way: home.
  await callAuthEndpoint("/sign-out", {});
  redirect(`/${locale}`);
}
