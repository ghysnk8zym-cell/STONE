import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon, type IconName } from "../icons/Icon";

/** Tab the bar highlights with `aria-current="page"`. */
export type TabBarCurrent =
  "home" | "catalog" | "favorites" | "cart" | "account";

/**
 * `label` is a key of `components.tabBar` in messages/*.json. Slugs are identical in both locales
 * (ADR-004). "Sign in" (key `account`) is session-aware (the `account` prop): a Guest goes to /sign-in, a signed-in
 * visitor sees "Account" and goes to /account, like the header account button.
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
const ITEM_BASE =
  "flex h-[52px] w-full flex-col items-center justify-center gap-1 rounded-xl py-1 type-footer-small whitespace-nowrap select-none";
const ITEM = cn(
  "flex h-[52px] w-full flex-col items-center justify-center gap-1 rounded-xl py-1 type-footer-small whitespace-nowrap outline-0 motion-hover",
  "focusv:outline-2 focusv:outline-accent-focus",
);
const IDLE = "text-secondary hov:text-primary";
const CURRENT = "text-primary";
/** Inert tab: the idle look, no hover reaction, not focusable (Figma shows the tab as usual). */
const INERT = "cursor-default";

export function TabBar({
  current,
  inert = [],
  account = { href: "/account", signedIn: false },
  fill = "header",
}: {
  current?: TabBarCurrent;
  /** Tabs whose page does not exist yet: rendered as non-link items with `aria-disabled`. */
  inert?: readonly TabBarCurrent[];
  /** Target and label of the last tab: "Sign in" for a Guest, "Account" when signed in. */
  account?: { href: string; signedIn: boolean };
  /**
   * Fill of the bar: `header` (surface/header, 62 %) as on Home v2 and Product, `footer` (surface/footer, 82 %) as the
   * Account screens draw it (Account 390 737:6583). On the light account pages only the denser fill keeps the idle
   * labels at 4.5:1.
   */
  fill?: "header" | "footer";
}) {
  const t = useTranslations("components.tabBar");
  const label = (key: TabBarCurrent) =>
    key === "account" && account.signedIn ? t("accountSignedIn") : t(key);

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "glass-blur border-glass fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 mx-auto max-w-[358px] rounded-[20px] border px-[11px] py-[7px] max-[360px]:px-[3px] md:hidden",
        fill === "footer" ? "bg-surface-footer" : "bg-surface-header",
      )}
    >
      <ul className="flex h-[52px] items-center justify-between">
        {TABS.map(({ key, href, icon }) => (
          <li
            key={key}
            className="max-w-16 min-w-0 flex-1 max-[360px]:min-w-11 max-[360px]:flex-auto"
          >
            {inert.includes(key) ? (
              <span
                role="link"
                aria-disabled="true"
                className={cn(ITEM_BASE, "text-secondary", INERT)}
              >
                <Icon name={icon} />
                {label(key)}
              </span>
            ) : (
              <Link
                href={key === "account" ? account.href : href}
                aria-current={current === key ? "page" : undefined}
                className={cn(ITEM, current === key ? CURRENT : IDLE)}
              >
                <Icon name={icon} />
                {label(key)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
