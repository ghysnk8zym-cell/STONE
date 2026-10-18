"use client";

import { useAccountState } from "@/features/account/account-context";
import { usePathname } from "@/i18n/navigation";

import { INERT } from "./nav-items";
import { TabBar, type TabBarCurrent } from "./TabBar";

/**
 * Tab highlighted for a locale-stripped pathname: `/` is Home; `/catalog` and any product page below
 * it (`/catalog/<slug>`) are Catalog, as Figma's Product screen draws Catalog active (782:11815);
 * `/account/favorites` is Favorites and the rest of the account area is the account tab ("Sign in",
 * Figma Account 737:6583).
 */
export function tabBarCurrentFor(pathname: string): TabBarCurrent | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "home";
  if (path === "/catalog" || path.startsWith("/catalog/")) return "catalog";
  if (path === "/account/favorites") return "favorites";
  if (path === "/account" || path.startsWith("/account/")) return "account";
  return undefined;
}

/**
 * Client wrapper of the layout's tab bar: reads the route and the visitor state. The last tab is
 * "Sign in" for a Guest (-> /sign-in) and "Account" once signed in (-> /account).
 */
export function ShellTabBar() {
  const { status } = useAccountState();
  const current = tabBarCurrentFor(usePathname());
  return (
    <TabBar
      current={current}
      // The Account screens draw the denser fill (see TabBar `fill`).
      fill={
        current === "account" || current === "favorites" ? "footer" : "header"
      }
      inert={INERT.tabBar}
      account={
        status === "guest"
          ? { href: "/sign-in", signedIn: false }
          : { href: "/account", signedIn: status === "signed-in" }
      }
    />
  );
}
