"use client";

import { usePathname } from "@/i18n/navigation";

import { PHASE3_INERT } from "./nav-items";
import { TabBar, type TabBarCurrent } from "./TabBar";

/**
 * Tab highlighted for a locale-stripped pathname: `/` is Home, `/catalog` Catalog. A product page
 * (`/catalog/<slug>`) highlights nothing, like Figma's Product screen (docs/ARCHITECTURE.md).
 */
export function tabBarCurrentFor(pathname: string): TabBarCurrent | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "home";
  if (path === "/catalog") return "catalog";
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
