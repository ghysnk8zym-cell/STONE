import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { getAuth } from "./auth";
import { CLIENT_IP_HEADER } from "./constants";

export type Role = "client" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type Session = { user: SessionUser };

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
