import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { HomeContentEditor } from "@/components/admin/HomeContentEditor";
import { AdminPageHeader } from "@/components/admin/parts";
import { getHomeTextEditor } from "@/server/admin/content-queries";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/site-content">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("siteContent") };
}

/* Site content (Figma 1440 1077:53429): the approved Home text surface only. */
export default async function AdminSiteContentPage({
  params,
}: PageProps<"/[locale]/admin/site-content">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const [ru, en, t] = await Promise.all([
    getHomeTextEditor("ru"),
    getHomeTextEditor("en"),
    getTranslations("admin.siteContent"),
  ]);
  return (
    <>
      <AdminPageHeader title={t("title")} subtitle={t("subtitle")} />
      <HomeContentEditor data={{ ru, en }} initialLocale={locale as Locale} />
    </>
  );
}
