import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { OrderDetail } from "@/components/account/OrderDetail";
import { routing, type Locale } from "@/i18n/routing";
import { NOT_FOUND_SEGMENT, ORDER_NUMBER_SHAPE } from "@/lib/route-gate";
import { requireUser } from "@/server/auth/guards";
import { getOwnOrder } from "@/server/shop/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/orders/[number]">): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account.orders",
  });
  let label = number;
  try {
    label = decodeURIComponent(number);
  } catch {
    // malformed percent-encoding: the page itself answers 404; the title keeps the raw segment
  }
  return {
    title: t("meta", { number: label }),
    robots: { index: false, follow: false },
  };
}

/*
 * One order of the signed-in customer. The query filters by the session user, so another customer's number (or an
 * unknown one) is answered like any unknown page: redirected (307, no-store) to the gate's localised 404, the
 * product page's approach (notFound() during render sends an empty error shell in Next 16.3.8).
 */
export default async function AccountOrderPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/orders/[number]">) {
  const { locale, number } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const order = ORDER_NUMBER_SHAPE.test(number)
    ? await getOwnOrder(user.id, number, locale)
    : null;
  if (!order) redirect(`/${locale}/${NOT_FOUND_SEGMENT}`);
  const query = await searchParams;
  return <OrderDetail order={order} placed={query.placed === "1"} />;
}
