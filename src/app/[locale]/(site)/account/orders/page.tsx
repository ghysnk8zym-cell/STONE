import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { OrderCard, OrdersEmpty } from "@/components/account/Orders";
import { PageHead } from "@/components/account/PageHead";
import type { Locale } from "@/i18n/routing";
import { listOrders } from "@/server/account/queries";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/orders">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account.meta",
  });
  return { title: t("orders") };
}

/*
 * Orders (Figma Account / Orders 1440 742:7324, 1024 742:7471, 768 742:7607, 390 742:7736): one card per order,
 * newest first. Figma also draws an empty "Saved" heading with an empty grid under the cards; it holds
 * nothing to show, so it is not drawn (Task 4 report, residuals).
 */
export default async function AccountOrdersPage({
  params,
}: PageProps<"/[locale]/account/orders">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(locale);
  const t = await getTranslations("account.orders");
  const orders = await listOrders(user.id, locale);

  return (
    <>
      <PageHead title={t("title")} subtitle={t("subtitle")} />
      {orders.length === 0 ? (
        <OrdersEmpty />
      ) : (
        <ul className="flex list-none flex-col gap-(--layout-section-gap)">
          {orders.map((order) => (
            <OrderCard key={order.number} order={order} />
          ))}
        </ul>
      )}
    </>
  );
}
