import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { IconButton } from "@/components/buttons/IconButton";
import { CartView } from "@/features/cart/CartView";
import type { Locale } from "@/i18n/routing";

import { PAGE_SURFACE_ATTR, PAGE_SURFACE_CATALOG } from "../page-surface";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "cart.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

/*
 * Cart (test shop; no Figma frame). The light catalog surface and the Account page frame (padding
 * layout/margin, back row, 44 px title); the lines live in the browser, so the content is a client island.
 */
export default async function CartPage({
  params,
}: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("cart");
  return (
    <div
      {...{ [PAGE_SURFACE_ATTR]: PAGE_SURFACE_CATALOG }}
      className="bg-stone-catalog-page flex-1 px-(--layout-margin) pt-(--layout-main-top) pb-16"
    >
      <div className="mx-auto flex w-full max-w-[1286px] flex-col gap-(--layout-section-gap)">
        <div>
          <IconButton
            icon="back"
            tone="ink"
            href="/catalog"
            label={t("back")}
          />
        </div>
        <CartView locale={locale} />
      </div>
    </div>
  );
}
