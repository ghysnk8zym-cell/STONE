import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TestBanner } from "@/components/navigation/TestBanner";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/server/auth/guards";

// Per request: the guard reads the session, which does not exist at build time.
export const dynamic = "force-dynamic";

// The admin area is never indexed, whatever the site's INDEXING switch says.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/*
 * Admin shell (Figma Admin 1920 / 1440 / 1024; Overview 1440 1077:51932, 1024 1077:55042): the dark sidebar
 * (264 px at 1440, 216 px at 1024) and the Main column on the light catalog surface, padding 36 / 40 / 28 at
 * 1440 and 32 at 1024, 24 px between the blocks. It is not inside the site shell: no site header, footer or tab bar.
 * Admin layouts exist from 1024 only (owner decision, spec section 1); below that a localised message replaces
 * the shell, and the shell is `display: none`, so assistive technology reads one or the other.
 *
 * The layout calls `requireRole("admin")`: a Guest goes to sign-in, a Client gets a 404 (the admin area does not reveal
 * itself). Every page and action below calls it again (React `cache` makes the second read free): a layout is not
 * re-rendered on every client navigation, so the layout guard alone is not a boundary (Phase 4a plan, Global Constraints).
 */
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.narrow",
  });

  return (
    <div className="bg-stone-catalog-page min-h-dvh">
      <TestBanner />
      <main
        data-admin-narrow
        className="text-stone-catalog-ink flex min-h-dvh flex-col items-start justify-center gap-4 px-6 py-16 lg:hidden"
      >
        <h1 className="type-catalog-product-title">{t("title")}</h1>
        <p className="type-catalog-field-value text-stone-catalog-secondary max-w-prose">
          {t("body")}
        </p>
      </main>
      <div data-admin-shell className="hidden min-h-dvh lg:flex">
        <AdminSidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-6 px-8 pt-9 pb-7 min-[90rem]:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
