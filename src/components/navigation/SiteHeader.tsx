import { useTranslations } from "next-intl";

import { IconButton } from "../buttons/IconButton";
import { HeaderMenuButton } from "./HeaderMenuButton";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";
import { NavPill } from "./NavPill";
import type { NavCurrent } from "./nav-items";

/*
 * Figma: "Header/Full + Account" 732:539 (>= 1280, description) and the Layout / Header
 * instances of the screens. The screens draw the Compact layout (logo + Cart + Menu) at 1024,
 * 768, 390 and 360 (Home v2 722:1618, 724:1669 > 724:1724, 716:1064, 724:1980; Account 390
 * 737:6409) and the Full layout only at 1440, so the switch is at 1280 (Tailwind `xl`). One DOM,
 * responsive classes: Create Your Stone, the account button and the language switch are
 * `hidden xl:*`, the menu button is `xl:hidden`; the language switch lives in the mobile menu
 * below 1280.
 * Values: 72 px high, border-b border/glass, fill surface/header + backdrop blur 12 (glass-header),
 * side padding layout/header-pad-x (per breakpoint), gap 12 between the right-hand controls in
 * Compact and 24 in Full. Sticky and full-bleed per the Figma component description.
 */
export function SiteHeader({ current }: { current?: NavCurrent }) {
  const t = useTranslations("components.nav");

  return (
    <header className="border-glass glass-header sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b px-(--layout-header-pad-x)">
      <Logo />
      <nav
        aria-label={t("primary")}
        className="flex items-center gap-3 xl:gap-6"
      >
        {/* Wrappers (not classes on the pill) carry hidden / xl:contents: the pill sets its own display. */}
        <span className="hidden xl:contents">
          <NavPill href="/create-your-stone" current={current === "create"}>
            {t("createYourStone")}
          </NavPill>
        </span>
        <NavPill href="/cart" current={current === "cart"}>
          {t("cart")}
        </NavPill>
        <span className="hidden xl:contents">
          <IconButton
            icon="user"
            label={t("account")}
            href="/account"
            current={current === "account"}
          />
          <LanguageSwitch />
        </span>
        <HeaderMenuButton current={current} />
      </nav>
    </header>
  );
}
