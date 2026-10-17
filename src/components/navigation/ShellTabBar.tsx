"use client";

import { usePathname } from "@/i18n/navigation";

import { PHASE3_INERT } from "./nav-items";
import { TabBar, type TabBarCurrent } from "./TabBar";

/**
 * Tab highlighted for a locale-stripped pathname: `/` is Home; `/catalog` and any product page below
 * it (`/catalog/<slug>`) are Catalog, as Figma's Product screen draws Catalog active (782:11815).
 */
export function tabBarCurrentFor(pathname: string): TabBarCurrent | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "home";
  if (path === "/catalog" || path.startsWith("/catalog/")) return "catalog";
  return undefined;
}

/** Client wrapper of the layout's tab bar: reads the route, applies the Phase 3 inert list. */
export function ShellTabBar() {
  return (
    <TabBar
      current={tabBarCurrentFor(usePathname())}
      inert={PHASE3_INERT.tabBar}
    />
  );
}
