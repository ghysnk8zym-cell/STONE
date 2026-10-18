"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

import { cn } from "../cn";
import { DARK_PANEL } from "./parts";
import { sectionFor, type AccountSection } from "./sections";

/*
 * The sidebar panel. Figma's sidebar is as tall as the screen's content, and on the Orders, Favorites and Profile
 * screens that content is taller than the sample rows: Orders (742:7324, Shell 860) keeps an empty "Saved" block
 * under the cards, Favorites (742:11470, Shell 826) has a second row of tiles, Profile (742:16191, Shell 477) the
 * details card. With only a few real rows the sidebar would end right under "Sign out" while Figma's stays tall,
 * so at 1440 it keeps the Figma shell height as a minimum. The Overview is as tall as its content. Client component
 * because the current section comes from the route and the layout does not re-render between sections.
 */
const FIGMA_SHELL_MIN_HEIGHT: Record<AccountSection, string | undefined> = {
  overview: undefined,
  orders: "min-[90rem]:min-h-[860px]",
  favorites: "min-[90rem]:min-h-[826px]",
  profile: "min-[90rem]:min-h-[477px]",
};

export function SidebarFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const section = sectionFor(usePathname());
  return (
    <nav
      aria-label={label}
      className={cn(
        DARK_PANEL,
        "hidden w-[232px] shrink-0 flex-col items-stretch gap-2 self-stretch p-3 lg:flex min-[90rem]:w-[288px]",
        section && FIGMA_SHELL_MIN_HEIGHT[section],
      )}
    >
      {children}
    </nav>
  );
}
