import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Overview } from "@/components/admin/Overview";
import {
  AdminFootnote,
  AdminLinkButton,
  AdminPageHeader,
} from "@/components/admin/parts";
import type { Locale } from "@/i18n/routing";
import { getAdminOverview } from "@/server/admin/queries";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("overview") };
}

/* Overview (Figma 1440 1077:51932, 1920 1061:50362, 1024 1077:55042). */
export default async function AdminOverviewPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const t = await getTranslations("admin.overview");
  const overview = await getAdminOverview(locale);

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <AdminLinkButton href="/admin/products/new" icon="plus">
            {t("addProduct")}
          </AdminLinkButton>
        }
      />
      <Overview overview={overview} />
      <AdminFootnote>{t("footnote")}</AdminFootnote>
    </>
  );
}
