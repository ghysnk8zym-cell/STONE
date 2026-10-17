import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { NAV_IDLE, NavIcon, NavIndicator } from "./nav-parts";
import { Avatar, DARK_PANEL } from "./parts";
import { SidebarSections } from "./SidebarSections";

/*
 * Figma Account sidebar (Account 1440 736:5325): 288 px wide at 1440 and 232 px at 1024, p 12, gap 8,
 * surface/footer fill, border/glass, blur 12, r20, as tall as the content. From the top: User block 60 px
 * (Avatar Stone, name Inter Medium 14, caption 12/16), the four section buttons (46 px pills), a spacer, a
 * divider, Support and Sign out. Below 1024 the sidebar is not drawn: the "Account sections" menu replaces it
 * (Account 390 737:6532, 768 737:6274).
 */

export function AccountSidebar({
  name,
  initials,
}: {
  name: string;
  initials: string;
}) {
  const t = useTranslations("account.nav");
  return (
    <nav
      aria-label={t("label")}
      className={cn(
        DARK_PANEL,
        "hidden w-[232px] shrink-0 flex-col items-stretch gap-2 self-stretch p-3 lg:flex min-[90rem]:w-[288px]",
      )}
    >
      <div className="flex h-[60px] items-center gap-3 px-2.5 py-2">
        <Avatar initials={initials} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-button-label text-primary truncate">{name}</p>
          <p className="type-footer-small text-secondary truncate">
            {t("caption")}
          </p>
        </div>
      </div>
      <SidebarSections />
      <div className="min-h-px flex-1" />
      <div className="bg-glass h-px w-full" />
      {/* Support has no screen in Figma (owner decision): it stays inert. */}
      <span
        role="link"
        aria-disabled="true"
        className="text-secondary type-catalog-action flex h-[46px] w-full cursor-default items-center gap-3 rounded-full pr-3.5 pl-2.5 select-none"
      >
        <NavIndicator visible={false} />
        <NavIcon name="support" />
        <span className="min-w-0 flex-1">{t("support")}</span>
      </span>
      <Link href="/sign-out" className={NAV_IDLE}>
        <NavIndicator visible={false} />
        <NavIcon name="sign-out" />
        <span className="min-w-0 flex-1">{t("signOut")}</span>
      </Link>
    </nav>
  );
}
