import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminComingSoon } from "@/components/admin/ComingSoon";
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

/* Site content (Figma 1440 1077:53429): Phase 4b. Until then, the header and the "next update" card. */
export default async function AdminSiteContentPage({
  params,
}: PageProps<"/[locale]/admin/site-content">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  return <AdminComingSoon section="siteContent" />;
}
