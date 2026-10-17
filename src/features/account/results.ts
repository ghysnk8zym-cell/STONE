/*
 * What the account server actions return to the browser. Client-safe and dependency-free: the
 * client components import these types (erased at build time) and turn the codes into localised
 * copy (`account.*`). Only codes and the saved value travel, never anything from Better Auth's
 * response (it holds the session token).
 */

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; code: "invalid" | "not-found" | "unavailable" };

export type UpdateProfileNameResult =
  { ok: true; name: string } | { ok: false; code: "invalid" | "unavailable" };

export type ChangePasswordErrorCode =
  | "invalid"
  | "invalidCurrent"
  | "weakPassword"
  | "tooManyAttempts"
  | "unavailable"
  | "generic";

export type ChangePasswordResult =
  { ok: true } | { ok: false; code: ChangePasswordErrorCode };

/** `GET /api/me`: what the site shell needs to draw hearts and the account entries. */
export type AccountState = {
  signedIn: boolean;
  /** Display name for the greeting; null for a Guest. */
  name: string | null;
  /** Slugs of the signed-in user's favourites. */
  favorites: string[];
};

export const GUEST_STATE: AccountState = {
  signedIn: false,
  name: null,
  favorites: [],
};
