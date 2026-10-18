import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminFootnote, AdminPageHeader } from "@/components/admin/parts";
import { OrdersView, type OrdersQuery } from "@/components/admin/OrdersView";
import type { Locale } from "@/i18n/routing";
import { listAdminOrders, type AdminOrder } from "@/server/admin/queries";
import { requireRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/orders">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "admin.meta",
  });
  return { title: t("orders") };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function matches(order: AdminOrder, q: string): boolean {
  if (!q) return true;
  const needle = q.toLocaleLowerCase();
  return [
    order.number,
    order.customer.name,
    order.customer.email,
    ...order.items.map((item) => item.name),
  ].some((text) => text.toLocaleLowerCase().includes(needle));
}

/*
 * Orders (Figma 1440 1077:52201, 1920 1062:50528, 1024 1077:55311). State is the URL: `q`, `status` (fulfillment filter)
 * and `order` (the selected order; the newest shown one when it is missing or not in the filtered list).
 */
export default async function AdminOrdersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/orders">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireRole("admin", locale);
  const search = await searchParams;
  const q = first(search.q).trim().slice(0, 100);
  const rawStatus = first(search.status);
  const status: OrdersQuery["status"] =
    rawStatus === "in_progress" || rawStatus === "delivered"
      ? rawStatus
      : "all";
  const wanted = first(search.order);

  const t = await getTranslations("admin.orders");
  const all = await listAdminOrders(locale);
  const orders = all.filter(
    (order) =>
      (status === "all" || order.status === status) && matches(order, q),
  );
  const selected = orders.find((o) => o.number === wanted) ?? orders[0] ?? null;

  return (
    <>
      <AdminPageHeader title={t("title")} subtitle={t("subtitle")} />
      <OrdersView orders={orders} selected={selected} query={{ q, status }} />
      <AdminFootnote>{t("footnote")}</AdminFootnote>
    </>
  );
}
