"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import { LanguageSwitch } from "../navigation/LanguageSwitch";
import { ADMIN_SECTIONS, adminSectionFor } from "./sections";

/*
 * Admin/Sidebar (Figma 1060:52244; Admin Overview 1440 1077:51933): dark Stone (surface/page), 264 px wide at 1440
 * and 216 px at 1024 (Admin 1024 1077:55042), padding 28 / 16 / 24, gap 6. From the top: Brand (a 24 px rule, STONE in
 * Brand/Logo, ADMIN in Section/Label), the seven section pills (46 px, the Account/Nav button look: idle = text/secondary
 * with 10 px left padding, selected = fill surface/selected, text/primary, 4 px more padding and the 3 x 18 indicator), a
 * spacer, a divider, language switch and Sign out. A client component because the current section comes from the route and a layout does
 * not know it.
 */
const PILL =
  "motion-hover focusv:outline-2 focusv:-outline-offset-2 focusv:outline-accent-focus flex h-[46px] w-full items-center gap-3 rounded-full pr-3.5 text-left outline-0 type-catalog-action";
const IDLE = cn(PILL, "pl-2.5 text-secondary hov:bg-surface-button");
const SELECTED = cn(PILL, "bg-surface-selected pl-3.5 text-primary");

function Indicator({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary h-[18px] w-[3px] shrink-0 rounded-[2px]",
        !visible && "opacity-0",
      )}
    />
  );
}

export function AdminSidebar() {
  const t = useTranslations("admin");
  const current = adminSectionFor(usePathname());
  const name = useTranslations("common")("siteName");

  return (
    <nav
      aria-label={t("nav.label")}
      className="bg-surface-page flex w-[216px] shrink-0 flex-col gap-1.5 self-stretch px-4 pt-7 pb-6 min-[90rem]:w-[264px]"
    >
      <div className="flex flex-col gap-1.5 pb-7 pl-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="bg-divider-light h-px w-6" />
          <span className="text-primary type-brand-logo whitespace-nowrap">
            {name}
          </span>
        </div>
        <p className="type-section-label text-label uppercase">
          {t("nav.brand")}
        </p>
      </div>
      {ADMIN_SECTIONS.map(({ key, href, icon }) => {
        const selected = current === key;
        return (
          <Link
            key={key}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={selected ? SELECTED : IDLE}
          >
            <Indicator visible={selected} />
            <Icon name={icon} />
            <span className="min-w-0 flex-1">{t(`nav.${key}`)}</span>
          </Link>
        );
      })}
      <div className="min-h-px flex-1" />
      <div className="bg-glass h-px w-full" />
      <LanguageSwitch
        variant="sidebar"
        className={cn(IDLE, "cursor-pointer")}
        leading={
          <>
            <Indicator visible={false} />
            <span aria-hidden="true" className="size-6 shrink-0" />
          </>
        }
      />
      <Link href="/sign-out" className={IDLE}>
        <Indicator visible={false} />
        <Icon name="sign-out" />
        <span className="min-w-0 flex-1">{t("nav.signOut")}</span>
      </Link>
    </nav>
  );
}
