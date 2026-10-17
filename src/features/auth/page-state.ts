import "server-only";

import { redirect } from "next/navigation";

import { accountPath, sanitizeNext } from "@/lib/safe-next";
import { authAvailable } from "@/server/auth/auth";
import { getSession } from "@/server/auth/session";

/**
 * What the sign-in and sign-up pages show (spec sections 2 and 3):
 * - no database (or one that cannot be reached): the localised "unavailable" state, never a 500;
 * - a signed-in user: redirected to the account page;
 * - a Guest: the form.
 */
export async function loadAuthPage(
  locale: string,
): Promise<"unavailable" | "form"> {
  if (!authAvailable()) return "unavailable";
  let signedIn: boolean;
  try {
    signedIn = (await getSession()) !== null;
  } catch (error) {
    // Name only: a driver error message can contain the connection URL.
    console.error(
      `[auth] sign-in page: session lookup failed (${error instanceof Error ? error.name : "error"})`,
    );
    return "unavailable";
  }
  // Outside the try: redirect() throws.
  if (signedIn) redirect(accountPath(locale));
  return "form";
}

/**
 * `next` from the query string for the hidden form field: the sanitised internal path, or undefined
 * when the page was opened without one (a missing `next` is not turned into the account page here, so
 * the sign-up / sign-in link between the two screens does not carry a made-up value).
 */
export function nextFromSearch(
  value: string | string[] | undefined,
  locale: string,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined ? undefined : sanitizeNext(raw, locale);
}
