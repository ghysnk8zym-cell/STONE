import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { getAuth } from "./auth";
import { CLIENT_IP_HEADER, SESSION_COOKIE_NAMES } from "./constants";

export type Role = "client" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type Session = { user: SessionUser };

/**
 * The request's Cookie header with the session cookie replaced by the one in the cookie store, or null when
 * the store has none (then the request header is used as it came). Only the session cookie is taken from the
 * store; the other cookies stay as the client sent them.
 */
async function rotatedSessionCookie(): Promise<string | null> {
  const stored = (await cookies())
    .getAll()
    .find((c) => (SESSION_COOKIE_NAMES as readonly string[]).includes(c.name));
  if (!stored) return null;
  const others = (
    ((await headers()).get("cookie") ?? "").split(";") as string[]
  )
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !(SESSION_COOKIE_NAMES as readonly string[]).includes(
          part.split("=")[0]!,
        ),
    );
  return [...others, `${stored.name}=${encodeURIComponent(stored.value)}`].join(
    "; ",
  );
}

/**
 * The signed-in user of this request, validated against the database (session row exists, is not
 * expired, belongs to an existing user). Null for a Guest and in no-database mode. Deduplicated
 * per request by React `cache`.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const auth = await getAuth();
  if (!auth) return null;
  // The raw request headers carry whatever the client sent. The internal client-IP header is ours
  // alone (src/server/auth/next.ts sets it from the platform rule), so a client-set one is dropped.
  const forwarded = new Headers(await headers());
  forwarded.delete(CLIENT_IP_HEADER);
  // A server action that rotated the session (sign-in, password change) set the new cookie in the cookie store
  // during this very request. The re-render that follows reads the request headers, which still carry the old
  // cookie, so the new value from the store must win.
  const rotated = await rotatedSessionCookie();
  if (rotated) forwarded.set("cookie", rotated);
  const result = await auth.api.getSession({
    headers: forwarded,
    // The cookie cache is disabled in auth.ts; this keeps a guard correct even if it is enabled.
    query: { disableCookieCache: true },
  });
  if (!result) return null;
  const { id, email, name, role } = result.user;
  // Only the two known roles; anything else is treated as the least privileged.
  return {
    user: { id, email, name, role: role === "admin" ? "admin" : "client" },
  };
});
