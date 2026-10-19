import { GUEST_STATE, type AccountState } from "@/features/account/results";
import { listFavoriteSlugs } from "@/server/account/queries";
import { getSession } from "@/server/auth/session";

// Per request, never cached: it answers for whoever holds the session cookie.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

/**
 * What the site shell needs to draw the hearts and the account entries: whether the visitor is
 * signed in, the display name and the slugs of their favourites. Public pages keep their content separate
 * from session state, so a client island fetches this once per page load
 * (src/features/account/AccountStateProvider.tsx).
 *
 * Deliberately public: it is how a Guest finds out they are one, so it does not call `requireUser`
 * (which redirects). It reads only the caller's own session and returns neither the id nor the email,
 * and only the caller's own favourites, so there is nothing to protect from another user. Any failure
 * answers as a Guest: the shell then shows the sign-in entries instead of breaking.
 */
export async function GET(): Promise<Response> {
  try {
    const session = await getSession();
    if (!session) return Response.json(GUEST_STATE, { headers });
    const state: AccountState = {
      signedIn: true,
      name: session.user.name || null,
      favorites: await listFavoriteSlugs(session.user.id),
    };
    return Response.json(state, { headers });
  } catch (error) {
    // Name only: a driver error message can contain the connection URL.
    console.error(
      `[api/me] state lookup failed (${error instanceof Error ? error.name : "error"})`,
    );
    return Response.json(GUEST_STATE, { headers });
  }
}
