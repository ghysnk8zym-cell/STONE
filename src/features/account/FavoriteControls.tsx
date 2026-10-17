"use client";

import { Button } from "@/components/buttons/Button";
import { IconButton } from "@/components/buttons/IconButton";

import { useFavorite } from "./account-context";

/*
 * The live favourite controls of the public pages. Both read and toggle the visitor's favourites
 * through the account state (AccountStateProvider): a signed-in visitor toggles optimistically, a Guest
 * is sent to sign-in and comes back to this page. Until the state is known the control shows the
 * unsaved look.
 */

/** The ♥ of a catalog / showcase card (the Figma heart bubble, `tone="light"`). */
export function FavoriteHeart({
  slug,
  label,
}: {
  slug: string;
  /** Accessible name, e.g. "Save Black Marble to favorites". */
  label: string;
}) {
  const { favorited, toggle } = useFavorite(slug);
  return (
    <IconButton
      icon="heart"
      tone="light"
      label={label}
      pressed={favorited}
      onClick={toggle}
    />
  );
}

/**
 * The product page "Save" button (Figma Button/Save 779:546). The label stays "Save": the saved state is
 * `aria-pressed` and the filled heart, not a second label.
 */
export function FavoriteSaveButton({
  slug,
  label,
}: {
  slug: string;
  label: string;
}) {
  const { favorited, toggle } = useFavorite(slug);
  return (
    <Button variant="save" pressed={favorited} onClick={toggle}>
      {label}
    </Button>
  );
}
