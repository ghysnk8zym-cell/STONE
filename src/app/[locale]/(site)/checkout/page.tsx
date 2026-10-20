import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";

import { IconButton } from "@/components/buttons/IconButton";
import { CheckoutView } from "@/features/cart/CheckoutView";
import { routing, type Locale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/guards";
import { getSession } from "@/server/auth/session";

import { PAGE_SURFACE_ATTR, PAGE_SURFACE_CATALOG } from "../page-surface";

// Per request: the guard reads the session.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "checkout.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

/*
 * Checkout (test shop; no Figma frame). Placing an order requires an account: a Guest is sent to sign-in and comes
 * back to the CART (the cart stays in the browser), then continues from there. The action guards itself again.
 */
export default async function CheckoutPage({
  params,
}: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  // The locale goes into a redirect target below: check it first (as the product page does).
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!(await getSession())) {
    redirect(
      `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/cart`)}`,
    );
  }
  await requireUser(locale);
  const t = await getTranslations("checkout");
  return (
    <div
      {...{ [PAGE_SURFACE_ATTR]: PAGE_SURFACE_CATALOG }}
      className="bg-stone-catalog-page flex-1 px-(--layout-margin) pt-(--layout-main-top) pb-16"
    >
      <div className="mx-auto flex w-full max-w-[1286px] flex-col gap-(--layout-section-gap)">
        <div>
          <IconButton icon="back" tone="ink" href="/cart" label={t("back")} />
        </div>
        <CheckoutView locale={locale} />
      </div>
    </div>
  );
}
