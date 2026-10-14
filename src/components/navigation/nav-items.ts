/** Page the header highlights with `aria-current="page"`. */
export type NavCurrent = "create" | "cart" | "account";

/**
 * Entries shared by the header and the mobile menu. `label` is a key of `components.nav` in
 * messages/*.json. Slugs are identical in both locales (ADR-004); the locale prefix is added by
 * the next-intl `Link`.
 */
export const NAV_ITEMS = [
  { key: "create", href: "/create-your-stone", label: "createYourStone" },
  { key: "cart", href: "/cart", label: "cart" },
  { key: "account", href: "/account", label: "account" },
] as const satisfies readonly {
  key: NavCurrent;
  href: string;
  label: "createYourStone" | "cart" | "account";
}[];
