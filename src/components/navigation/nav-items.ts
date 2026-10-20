import type { TabBarCurrent } from "./TabBar";

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

/**
 * Controls that stay inert (non-link, `aria-disabled`) because their pages are not built yet (owner decision
 * A, docs/superpowers/specs/2026-10-14-phase-3-pages-design.md). Empty since the test shop shipped the Cart page
 * (docs/superpowers/specs/2026-10-19-test-shop-cart-checkout-design.md); the mechanism stays for future pages.
 * `tabBar` feeds `TabBar`, `nav` feeds `SiteHeader` and the mobile menu.
 */
export const INERT: {
  tabBar: readonly TabBarCurrent[];
  nav: readonly NavCurrent[];
} = {
  tabBar: [],
  nav: [],
};
