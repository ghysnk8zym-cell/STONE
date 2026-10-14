import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon, type IconName } from "../icons/Icon";

/** Tab the bar highlights with `aria-current="page"`. */
export type TabBarCurrent =
  "home" | "catalog" | "favorites" | "cart" | "account";

/**
 * `label` is a key of `components.tabBar` in messages/*.json. Slugs are identical in both locales
 * (ADR-004). "Sign in" (key `account`) points at /account, like the header account button: the
 * sign-in screen is a Figma gap (docs/FIGMA-INVENTORY.md section 5.1) and /account is the
 * destination the auth guard will redirect guests from.
 */
const TABS = [
  { key: "home", href: "/", icon: "home" },
  { key: "catalog", href: "/catalog", icon: "grid" },
  { key: "favorites", href: "/account/favorites", icon: "heart" },
  { key: "cart", href: "/cart", icon: "bag" },
  { key: "account", href: "/account", icon: "user" },
] as const satisfies readonly {
  key: TabBarCurrent;
  href: string;
  icon: IconName;
}[];

/*
 * Figma Nav/Tab bar 712:499 (screen instances Home v2 716:1285, Product 782:11815): 358x68 floating
 * bar, radius 20, 12/8 padding (11/7 here: Figma strokes sit inside the frame, CSS borders do not, so border + padding give the same 12/8 and 358x68), border border/glass, fill surface/header + effect style
 * "Blur/Glass background 24" (CSS blur 12), items spread with space-between. The component
 * description asks for 16 px above the bottom of the page, fixed while scrolling. Figma draws it
 * only on the 390 / 360 phone frames (Home 768 has none), so it is hidden from 768 (`md`); the
 * header carries the navigation from there. Pages need bottom padding of 100 px so the bar never
 * covers content: `max-md:pb-tabbar` (globals.css; docs/ARCHITECTURE.md, Layout notes for Phase 3).
 *
 * Item = Nav/Tab item 712:498 (Active 712:490, Default 712:494): 64x52 touch area, icon 24 over a
 * 12/16 label (Footer/Small, Inter 12), gap 4. Active: label text/primary, icon 100%. Default:
 * label text/secondary, icon 72%; the icon uses currentColor, so both follow the label colour
 * (text/secondary is white at 72%). Figma draws no hover, focus or pressed state: hover is the
 * Active colour, focus a 2 px accent-focus outline (same ring as the header controls), no ripple.
 * Colours are set per look (current / idle), never combined, because cn() is not twMerge.
 */
const ITEM = cn(
  "flex h-[52px] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl py-1 type-footer-small whitespace-nowrap outline-0 motion-hover",
  "focusv:outline-2 focusv:outline-accent-focus",
);
const IDLE = "text-secondary hov:text-primary";
const CURRENT = "text-primary";

export function TabBar({ current }: { current?: TabBarCurrent }) {
  const t = useTranslations("components.tabBar");

  return (
    <nav
      aria-label={t("label")}
      className="glass-blur border-glass bg-surface-header fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 mx-auto max-w-[358px] rounded-[20px] border px-[11px] py-[7px] md:hidden"
    >
      <ul className="flex h-[52px] items-center justify-between">
        {TABS.map(({ key, href, icon }) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={current === key ? "page" : undefined}
              className={cn(ITEM, current === key ? CURRENT : IDLE)}
            >
              <Icon name={icon} />
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
