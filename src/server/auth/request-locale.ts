import "server-only";

import { headers } from "next/headers";

import { routing } from "@/i18n/routing";

import { REQUEST_PATH_HEADER } from "./constants";

/**
 * The locale of the page a server action was called from. The middleware writes the page path to a
 * header it always overwrites, so a client cannot choose the value; an unknown one falls back to the
 * default locale. Actions pass it to the guards, which use it for the sign-in redirect.
 */
export async function requestLocale(): Promise<string> {
  const path = (await headers()).get(REQUEST_PATH_HEADER) ?? "";
  const first = path.split("/")[1] ?? "";
  return (routing.locales as readonly string[]).includes(first)
    ? first
    : routing.defaultLocale;
}
