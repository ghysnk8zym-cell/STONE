import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PromotionsView } from "@/components/admin/PromotionsView";
import { AdminFootnote, AdminPageHeader } from "@/components/admin/parts";
import type { Locale } from "@/i18n/routing";
import { getPromotionProducts } from "@/server/admin/promotion-queries";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/promotions">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("promotions") };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/* Promotions edits existing product price fields; no campaign lifecycle or scheduler. */
export default async function AdminPromotionsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/promotions">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const search = await searchParams;
  const q = first(search.q).trim().slice(0, 100);
  const wanted = first(search.product);
  const products = await getPromotionProducts(locale);
  const needle = q.toLocaleLowerCase();
  const shown = products.filter((product) =>
    `${product.name} ${product.slug}`.toLocaleLowerCase().includes(needle),
  );
  const selected =
    shown.find((product) => product.slug === wanted) ?? shown[0] ?? null;
  const t = await getTranslations("admin.promotions");
  return (
    <>
      <AdminPageHeader title={t("title")} subtitle={t("subtitle")} />
      <PromotionsView
        products={products}
        shown={shown}
        selected={selected}
        q={q}
      />
      <AdminFootnote>{t("footnote")}</AdminFootnote>
    </>
  );
}
