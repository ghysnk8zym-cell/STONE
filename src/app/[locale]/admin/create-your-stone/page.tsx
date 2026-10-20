import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminPageHeader, AdminFootnote } from "@/components/admin/parts";
import { StoneRequestsView } from "@/components/admin/StoneRequestsView";
import { getAdminStoneRequests } from "@/server/admin/stone-request-queries";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/server/auth/guards";
import { redirect } from "@/i18n/navigation";

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

/* Seeded examples and private public-form submissions. Delivery and payment remain unavailable. */
export default async function AdminCreateYourStonePage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/create-your-stone">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const paramsQuery = await searchParams;
  const one = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  const data = await getAdminStoneRequests(locale, {
    q: one(paramsQuery.q),
    status: one(paramsQuery.status),
    page: Number(one(paramsQuery.page)),
    request: one(paramsQuery.request),
  });
  const t = await getTranslations("admin.createYourStone");
  // Pin the implicit first selection in the URL before editing. Filter changes submit a fresh GET.
  if (data.selected && one(paramsQuery.request) !== data.selected.id) {
    redirect({
      locale: locale as Locale,
      href: {
        pathname: "/admin/create-your-stone",
        query: {
          request: data.selected.id,
          ...(data.q ? { q: data.q } : {}),
          ...(data.status !== "all" ? { status: data.status } : {}),
          ...(data.page > 1 ? { page: data.page } : {}),
        },
      },
    });
  }
  return (
    <>
      <AdminPageHeader title={t("title")} subtitle={t("subtitle")} />
      <StoneRequestsView data={data} />
      <AdminFootnote>{t("footnote")}</AdminFootnote>
    </>
  );
}
