"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/buttons/Button";
import { IconButton } from "@/components/buttons/IconButton";
import { useAccountState } from "@/features/account/account-context";
import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import { BlockHeader, CARD, EmptyCard, ProductImage } from "./parts";

/*
 * Favourites on the Account screens (Figma Account/Favorites block 819:585, Favorite tile 819:579, the cards of
 * Account / Favorites 742:11470). Client components: the heart removes the favourite. The item disappears at
 * once (the account state drops it optimistically, `src/features/account`) and comes back if the server refuses;
 * the list itself is a server render that the action's revalidation refreshes.
 *
 * Figma draws no heart on the Favorites cards (an arrow marks the link) and a bare outline heart on the
 * Overview tiles. The owner's spec asks for "heart removes" on the Favorites screen, so both get a heart control
 * that removes, drawn as the saved (filled) heart.
 */

export type FavoriteItem = {
  slug: string;
  name: string;
  /** Material label ("Marble"). */
  meta: string;
  image: string;
  imageFit: "cover" | "contain";
};

/** True once this item was removed here and the account state agrees; the item is then not drawn. */
function useRemoval(slug: string) {
  const { status, isFavorite, setFavorite } = useAccountState();
  const [clicked, setClicked] = useState(false);
  return {
    removed: clicked && !isFavorite(slug),
    // Before the state is known a click would be a guess (and a Guest cannot be here): ignore it.
    remove: () => {
      if (status !== "signed-in") return;
      setClicked(true);
      setFavorite(slug, false);
    },
  };
}

/** Card of the Favorites screen and of the phone Overview: photo, name with the arrow, material. */
export function FavoriteCard({
  item,
  removeLabel,
  className,
}: {
  item: FavoriteItem;
  /** With a label the card has the remove heart; the phone Overview cards have none (as in Figma). */
  removeLabel?: string;
  className?: string;
}) {
  const { removed, remove } = useRemoval(item.slug);
  if (removed) return null;
  return (
    <li
      className={cn(
        CARD,
        "[&:has(a:focus-visible)]:outline-accent-focus relative flex min-w-0 flex-col p-2 md:p-3 [&:has(a:focus-visible)]:outline-2 [&:has(a:focus-visible)]:outline-offset-2",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <ProductImage
          image={item.image}
          fit={item.imageFit}
          className="h-40 w-full md:h-64"
          sizes="(min-width: 1440px) 400px, (min-width: 768px) 30vw, 45vw"
        />
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="type-catalog-product-name text-stone-catalog-ink wrap-anywhere">
              <Link
                href={`/catalog/${item.slug}`}
                className="outline-0 after:absolute after:inset-0 after:content-['']"
              >
                {item.name}
              </Link>
            </h3>
            <p className="type-catalog-meta text-stone-catalog-secondary">
              {item.meta}
            </p>
          </div>
          <Icon
            name="arrow"
            className="text-stone-catalog-ink mt-0.5 size-5! md:mt-1.5"
          />
        </div>
      </div>
      {removeLabel ? (
        <div className="absolute top-3.5 right-3.5 z-10 md:top-[18px] md:right-[18px]">
          <IconButton
            icon="heart"
            tone="light"
            label={removeLabel}
            pressed
            onClick={remove}
          />
        </div>
      ) : null}
    </li>
  );
}

/** Account/Favorite tile 819:579 (from 1024): wide photo with the heart, the name as caption. */
function FavoriteTile({
  item,
  removeLabel,
}: {
  item: FavoriteItem;
  removeLabel: string;
}) {
  const { removed, remove } = useRemoval(item.slug);
  if (removed) return null;
  return (
    <li className="[&:has(a:focus-visible)]:outline-accent-focus relative flex min-w-0 flex-1 flex-col gap-2.5 [&:has(a:focus-visible)]:outline-2 [&:has(a:focus-visible)]:outline-offset-2">
      <ProductImage
        image={item.image}
        fit={item.imageFit}
        className="h-40 w-full"
        sizes="(min-width: 1440px) 300px, 200px"
      />
      <p className="type-catalog-meta text-stone-catalog-ink wrap-anywhere">
        <Link
          href={`/catalog/${item.slug}`}
          className="outline-0 after:absolute after:inset-0 after:content-['']"
        >
          {item.name}
        </Link>
      </p>
      <button
        type="button"
        aria-label={removeLabel}
        aria-pressed
        onClick={remove}
        className="text-stone-catalog-ink focusv:outline-2 focusv:outline-accent-focus absolute top-0.5 right-0.5 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full outline-0"
      >
        <Icon name="heart-filled" />
      </button>
    </li>
  );
}

/** Account/Favorites block 819:585 (from 1024): "Favorites", the View all link and the three latest tiles. */
/** `className` carries the display (the page shows it from 1024: `hidden lg:flex`). */
export function FavoritesBlock({
  items,
  className,
}: {
  items: FavoriteItem[];
  className?: string;
}) {
  const t = useTranslations("account.overview.favorites");
  const remove = useTranslations("account.favorites");
  return (
    <section
      className={cn(CARD, "flex-col gap-4 px-7 py-6", className)}
      aria-label={t("title")}
    >
      <BlockHeader
        title={t("title")}
        linkLabel={t("viewAll")}
        href="/account/favorites"
      />
      {items.length === 0 ? (
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex list-none gap-4">
          {items.map((item) => (
            <FavoriteTile
              key={item.slug}
              item={item}
              removeLabel={remove("remove", { name: item.name })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Your favorites" with the View favorites button and the card strip (below 1024; scrolls on phones). */
export function FavoritesStrip({
  items,
  className,
}: {
  items: FavoriteItem[];
  className?: string;
}) {
  const t = useTranslations("account.overview.favorites");
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-4 pt-2">
        <h2 className="text-ink [font-family:var(--font-display)] text-[26px] leading-8 font-normal">
          {t("yours")}
        </h2>
        <Button variant="outline" href="/account/favorites">
          {t("view")}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {t("empty")}
        </p>
      ) : (
        // A phone strip scrolls sideways; the scroller is focusable so the keyboard can scroll it.
        <ul
          tabIndex={0}
          aria-label={t("yours")}
          className="focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus flex list-none items-start gap-(--layout-card-gap) overflow-x-auto outline-0 md:overflow-visible"
        >
          {items.map((item) => (
            <FavoriteCard
              key={item.slug}
              item={item}
              className="w-[156px] shrink-0 md:w-auto md:flex-1"
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The Favorites screen grid: 2 columns on phones, 3 from 768, cards top-aligned (their heights differ). */
export function FavoritesGrid({ items }: { items: FavoriteItem[] }) {
  const t = useTranslations("account.favorites");
  return (
    <ul className="grid list-none grid-cols-2 items-start gap-(--layout-card-gap) md:grid-cols-3">
      {items.map((item) => (
        <FavoriteCard
          key={item.slug}
          item={item}
          removeLabel={t("remove", { name: item.name })}
        />
      ))}
    </ul>
  );
}

export function FavoritesEmpty() {
  const t = useTranslations("account.favorites.empty");
  return (
    <EmptyCard title={t("title")} body={t("body")}>
      <Button variant="outline" href="/catalog">
        {t("browse")}
      </Button>
    </EmptyCard>
  );
}
