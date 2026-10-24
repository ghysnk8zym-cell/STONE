import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountSidebar } from "@/components/account/AccountSidebar";
import { IconButton } from "@/components/buttons/IconButton";
import { displayNameOf, initialsOf } from "@/features/account/display";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/guards";

import { PAGE_SURFACE_ATTR, PAGE_SURFACE_CATALOG } from "../page-surface";

// Per request: the guard reads the session, which does not exist at build time.
export const dynamic = "force-dynamic";

/*
 * Account area shell (Figma Account 1440 736:5318, 1024 736:5449, 768 737:6274, 390 737:6405): the light catalog
 * surface, Main padding layout/margin (77 at 1440) and layout/main-top, 64 px below, the Back row (46 px
 * ink button + 16), then the Shell: the sidebar (from 1024) and the content column, 24 px apart at 1440 and
 * 16 px below (layout/card-gap). Content blocks are `layout/section-gap` apart.
 *
 * The layout calls `requireUser()`: a Guest never sees any account screen. Every page and action below calls it
 * again (React `cache` makes the second read free): a layout is not re-rendered on every client navigation, so
 * the layout guard alone is not a boundary (Phase 4a plan, Global Constraints).
 */
export default async function AccountLayout({
  children,
  params,
}: LayoutProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(locale);
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account",
  });

  return (
    <div
      {...{ [PAGE_SURFACE_ATTR]: PAGE_SURFACE_CATALOG }}
      className="bg-stone-catalog-page flex-1 px-(--layout-margin) pt-(--layout-main-top) pb-16"
    >
      <div className="mx-auto flex w-full max-w-(--layout-content-width) flex-col">
        <div className="pb-4">
          <IconButton icon="back" tone="ink" href="/" label={t("back")} />
        </div>
        <div className="flex items-start gap-(--layout-card-gap)">
          <AccountSidebar
            name={displayNameOf(user)}
            initials={initialsOf(user)}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-(--layout-section-gap)">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
