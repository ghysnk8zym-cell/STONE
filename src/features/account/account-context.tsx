"use client";

import { createContext, useCallback, useContext } from "react";

/*
 * The shape of the visitor state and the hooks the shell components read (header, tab bar, menu, hearts).
 * Kept apart from the provider so that components using the hooks do not import the server action the
 * provider calls.
 */

export type AccountStatus = "loading" | "guest" | "signed-in";

export type AccountContextValue = {
  status: AccountStatus;
  name: string | null;
  isFavorite: (slug: string) => boolean;
  /** Toggles a favourite; a Guest is sent to sign-in with the current page as `next`. */
  toggleFavorite: (slug: string) => void;
  /**
   * Sets a favourite to a given state (idempotent on the server). Adding as a Guest is the same sign-in
   * redirect as toggling; a signed-in call before the state is known is ignored.
   */
  setFavorite: (slug: string, favorited: boolean) => void;
};

export const AccountContext = createContext<AccountContextValue>({
  status: "loading",
  name: null,
  isFavorite: () => false,
  toggleFavorite: () => {},
  setFavorite: () => {},
});

export function useAccountState(): AccountContextValue {
  return useContext(AccountContext);
}

/** Favourite state of one product for its heart or Save button. */
export function useFavorite(slug: string) {
  const { isFavorite, toggleFavorite } = useAccountState();
  const favorited = isFavorite(slug);
  const toggle = useCallback(
    () => toggleFavorite(slug),
    [toggleFavorite, slug],
  );
  return { favorited, toggle };
}

/**
 * Where the account entries of the shell point: a Guest goes to sign-in, a signed-in visitor to the account
 * area. While the state is still loading it is the account area: the guard (and the middleware) send a Guest
 * on to sign-in with `next`, so the link works either way.
 */
export function useAccountHref(): "/sign-in" | "/account" {
  return useAccountState().status === "guest" ? "/sign-in" : "/account";
}
