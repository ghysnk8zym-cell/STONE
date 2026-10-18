import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { sanitizeNext } from "@/lib/safe-next";

import { REQUEST_PATH_HEADER } from "./constants";
import { getSession, type Role, type SessionUser } from "./session";

export { sanitizeNext };

/*
 * The authorization boundary (ADR-002). Every protected layout, page, server action and route
 * handler calls one of these; the middleware cookie check is only a shortcut for Guests.
 */

/** The signed-in user, or a redirect to `/{locale}/sign-in?next=<this page>`. */
export async function requireUser(locale: string): Promise<SessionUser> {
  const session = await getSession();
  if (session) return session.user;
  // The middleware puts the page path in this header; it is sanitised like any `next`, and a
  // missing or unsafe value (e.g. in a server action) falls back to the account page.
  const path = (await headers()).get(REQUEST_PATH_HEADER);
  const next = sanitizeNext(path, locale);
  const signInLocale = next.split("/")[1];
  redirect(`/${signInLocale}/sign-in?next=${encodeURIComponent(next)}`);
}

/**
 * The signed-in user with `role`. A Guest is sent to sign-in; a signed-in user without the role
 * gets a 404, so the admin area does not reveal that it exists (the 404-not-403 choice of the Phase 4 spec).
 */
export async function requireRole(
  role: Extract<Role, "admin">,
  locale: string,
): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.role !== role) notFound();
  return user;
}
