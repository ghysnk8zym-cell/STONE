import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  emptyProductValues,
  productFormOptions,
} from "@/components/admin/form-options";
import { AdminFootnote, AdminPageHeader } from "@/components/admin/parts";
import { ProductForm } from "@/components/admin/ProductForm";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/products/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("productsNew") };
}

/* Add product (Figma 1440 1077:52622, 1920 1070:51112, 1024 1077:55732). */
export default async function AdminNewProductPage({
  params,
}: PageProps<"/[locale]/admin/products/new">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const t = await getTranslations("admin.products");
  const options = await productFormOptions(locale);

  return (
    <>
      <AdminPageHeader
        lead={
          <Breadcrumb
            items={[
              { label: t("title"), href: "/admin/products" },
              { label: t("new.title") },
            ]}
          />
        }
        title={t("new.title")}
        subtitle={t("new.subtitle")}
      />
      <ProductForm
        mode="create"
        initial={emptyProductValues()}
        options={options}
      />
      <AdminFootnote>{t("new.footnote")}</AdminFootnote>
    </>
  );
}
