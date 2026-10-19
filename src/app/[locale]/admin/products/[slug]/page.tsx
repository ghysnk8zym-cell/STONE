import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  productFormOptions,
  productValuesOf,
} from "@/components/admin/form-options";
import { AdminFootnote, AdminPageHeader } from "@/components/admin/parts";
import { ProductForm } from "@/components/admin/ProductForm";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import type { Locale } from "@/i18n/routing";
import { getAdminProduct } from "@/server/admin/queries";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/products/[slug]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("productEdit"), robots: { index: false } };
}

/* Edit product: the Add product screen (Figma 1440 1077:52622) filled with the product. */
export default async function AdminEditProductPage({
  params,
}: PageProps<"/[locale]/admin/products/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const product = await getAdminProduct(slug);
  if (!product) notFound();
  const t = await getTranslations("admin.products");
  const options = await productFormOptions(locale);
  const name =
    (locale === "en" ? product.names.en : product.names.ru) || product.slug;

  return (
    <>
      <AdminPageHeader
        lead={
          <Breadcrumb
            items={[
              { label: t("title"), href: "/admin/products" },
              { label: name },
            ]}
          />
        }
        title={t("edit")}
        subtitle={name}
      />
      <ProductForm
        key={product.slug}
        mode="edit"
        initial={productValuesOf(product)}
        published={product.published}
        revision={product.revision}
        options={options}
      />
      <AdminFootnote>{t("new.footnote")}</AdminFootnote>
    </>
  );
}
