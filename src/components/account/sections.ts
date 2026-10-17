import type { IconName } from "../icons/Icon";

/** The four sections of the account area, in menu order. `href` is locale-free (the Link adds the locale). */
export const ACCOUNT_SECTIONS = [
  { key: "overview", href: "/account", icon: "home" },
  { key: "orders", href: "/account/orders", icon: "orders" },
  { key: "favorites", href: "/account/favorites", icon: "heart" },
  { key: "profile", href: "/account/profile", icon: "user" },
] as const satisfies readonly {
  key: string;
  href: string;
  icon: IconName;
}[];

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]["key"];

/** The section for a locale-stripped pathname (`/account/orders`), or undefined outside the area. */
export function sectionFor(pathname: string): AccountSection | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ACCOUNT_SECTIONS.find((section) => section.href === path)?.key;
}
