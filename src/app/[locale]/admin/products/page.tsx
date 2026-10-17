import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  AdminFootnote,
  AdminLinkButton,
  AdminPageHeader,
} from "@/components/admin/parts";
import { ProductsToolbar, ProductsView } from "@/components/admin/ProductsView";
import type { Locale } from "@/i18n/routing";
import {
  getProductCounts,
  listAdminProducts,
  type ProductStatusFilter,
} from "@/server/admin/queries";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/products">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("products") };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/* Products (Figma 1440 1077:52506, 1920 1069:50712, 1024 1077:55616). The filter state is the URL (`q`, `status`). */
export default async function AdminProductsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/products">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const query = await searchParams;
  const q = first(query.q).slice(0, 100);
  const raw = first(query.status);
  const status: ProductStatusFilter =
    raw === "published" || raw === "draft" ? raw : "all";

  const t = await getTranslations("admin.products");
  const [products, counts] = await Promise.all([
    listAdminProducts(locale, { q, status }),
    getProductCounts(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <AdminLinkButton href="/admin/products/new" icon="plus">
              {t("add")}
            </AdminLinkButton>
          }
        />
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {t("summary", { published: counts.published, draft: counts.draft })}
        </p>
      </div>
      <ProductsToolbar q={q} status={status} />
      <ProductsView
        products={products}
        filtered={q !== "" || status !== "all"}
      />
      <AdminFootnote>{t("footnote")}</AdminFootnote>
    </>
  );
}
