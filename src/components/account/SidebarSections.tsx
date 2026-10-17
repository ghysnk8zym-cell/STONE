"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { NAV_IDLE, NAV_SELECTED, NavIcon, NavIndicator } from "./nav-parts";
import { ACCOUNT_SECTIONS, sectionFor } from "./sections";

/**
 * The four section buttons of the sidebar. Client component because the current section comes from the
 * route and a layout does not know it. Selected = fill surface/selected, label text/primary, the
 * indicator bar visible and 4 px more left padding (Account/Nav button Selected, 736:5329).
 */
export function SidebarSections() {
  const t = useTranslations("account.nav");
  const current = sectionFor(usePathname());
  return (
    <>
      {ACCOUNT_SECTIONS.map(({ key, href, icon }) => {
        const selected = current === key;
        return (
          <Link
            key={key}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={selected ? NAV_SELECTED : NAV_IDLE}
          >
            <NavIndicator visible={selected} />
            <NavIcon name={icon} />
            <span className="min-w-0 flex-1">{t(key)}</span>
          </Link>
        );
      })}
    </>
  );
}
