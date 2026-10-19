import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CustomersView } from "@/components/admin/CustomersView";
import { AdminFootnote, AdminPageHeader } from "@/components/admin/parts";
import type { Locale } from "@/i18n/routing";
import { getAdminCustomers } from "@/server/admin/customer-queries";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/customers">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("customers") };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/* Customers: URL-based search, pagination and selection work without client state. */
export default async function AdminCustomersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/customers">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const actor = await requireRole("admin", locale);
  const search = await searchParams;
  const data = await getAdminCustomers(locale, {
    q: first(search.q),
    page: Number(first(search.page)),
    customer: first(search.customer),
  });
  const t = await getTranslations("admin.customers");
  return (
    <>
      <AdminPageHeader title={t("title")} subtitle={t("subtitle")} />
      <CustomersView data={data} actorId={actor.id} />
      <AdminFootnote>{t("footnote")}</AdminFootnote>
    </>
  );
}
