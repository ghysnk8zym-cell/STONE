import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminComingSoon } from "@/components/admin/ComingSoon";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/create-your-stone">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("createYourStone") };
}

/* Create Your Stone (Figma 1440 1077:52818): Phase 4b. Until then, the header and the "next update" card. */
export default async function AdminCreateYourStonePage({
  params,
}: PageProps<"/[locale]/admin/create-your-stone">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  return <AdminComingSoon section="createYourStone" />;
}
