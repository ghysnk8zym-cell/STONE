import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { OrderStatus } from "@/features/admin/results";
import type { AdminOrder } from "@/server/admin/queries";

import { ProductImage } from "../account/parts";
import { cn } from "../cn";
import { AdminSearch, AdminSelect } from "./fields";
import { FilterForm } from "./FilterForm";
import { useAdminMoney } from "./money";
import { OrderStatusForm } from "./OrderStatusForm";
import {
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
  StatusChip,
} from "./parts";

/*
 * Admin Orders (Figma 1440 1077:52201, 1024 1077:55311): the Orders list card (toolbar, table header, one row per
 * order with the selected one on stone/catalog-photo and a 3 px ink indicator, the count) beside the Order detail card
 * (360 px at 1440, stacked below at 1024). Rows are links that select an order through the URL (`?order=D-1052`), so
 * the screen works without JavaScript. Figma also has a Payment column and filter; payment is not in the data model
 * (orders have one status, In progress or Delivered, which is Figma's Fulfillment), so only fulfillment is drawn.
 */

export type OrdersQuery = { q: string; status: "all" | OrderStatus };

function useStatusLabel() {
  const t = useTranslations("admin.orders.status");
  return (status: OrderStatus) => t(status);
}

function OrderChip({ status }: { status: OrderStatus }) {
  const label = useStatusLabel();
  return (
    <StatusChip tone={status === "delivered" ? "fulfilled" : "processing"}>
      {label(status)}
    </StatusChip>
  );
}

export function OrdersToolbar({ query }: { query: OrdersQuery }) {
  const t = useTranslations("admin.orders");
  return (
    <FilterForm className="pb-5 max-md:flex-wrap">
      <AdminSearch
        label={t("searchLabel")}
        name="q"
        defaultValue={query.q}
        placeholder={t("searchPlaceholder")}
        className="min-w-0 flex-1"
      />
      <AdminSelect
        label={t("filterFulfillment")}
        name="status"
        value={query.status}
        hideLabel
        className="w-[210px]"
        options={[
          { value: "all", label: t("filter.all") },
          { value: "in_progress", label: t("filter.in_progress") },
          { value: "delivered", label: t("filter.delivered") },
        ]}
      />
    </FilterForm>
  );
}

function OrderRow({
  order,
  selected,
  query,
}: {
  order: AdminOrder;
  selected: boolean;
  query: OrdersQuery;
}) {
  const t = useTranslations("admin.orders");
  const format = useFormatter();
  const money = useAdminMoney();
  const first = order.items[0];
  const search: Record<string, string> = { order: order.number };
  if (query.q) search.q = query.q;
  if (query.status !== "all") search.status = query.status;

  return (
    <li>
      <Link
        href={{ pathname: "/admin/orders", query: search }}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "motion-hover focusv:outline-2 focusv:-outline-offset-2 focusv:outline-ink-primary border-stone-catalog-line relative flex items-center gap-4 border-b px-5 py-3.5 outline-0",
          selected
            ? "bg-stone-catalog-photo rounded-[10px]"
            : "hov:bg-overlay-tint-10",
        )}
      >
        {selected && (
          <span
            aria-hidden="true"
            className="bg-stone-catalog-ink absolute top-4 left-0 h-10 w-[3px] rounded-[2px]"
          />
        )}
        <span className="flex w-[110px] shrink-0 flex-col gap-0.5">
          <span className="type-catalog-product-name-sm text-stone-catalog-ink">
            {order.number}
          </span>
          <span className="type-footer-small text-stone-catalog-secondary">
            {t(`kind.${order.kind}`)}
          </span>
          <span className="type-footer-small text-stone-catalog-secondary">
            {format.dateTime(order.createdAt, {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {first && (
            <ProductImage
              image={first.image}
              fit={first.imageFit}
              className="h-[34px] w-[46px] shrink-0 rounded-md min-[90rem]:hidden"
              sizes="46px"
            />
          )}
          <span className="type-catalog-field-value text-stone-catalog-ink min-w-0 wrap-anywhere">
            {first?.name ?? t("noItems")}
            {order.items.length > 1 && (
              <span className={cn(ADMIN_MUTED, "ml-2")}>
                {t("more", { count: order.items.length - 1 })}
              </span>
            )}
          </span>
        </span>
        <span className="w-[116px] shrink-0 max-md:hidden">
          <OrderChip status={order.status} />
        </span>
        <span className="type-catalog-product-name-sm text-stone-catalog-ink w-[80px] shrink-0 text-right">
          {money(order.totalCents)}
        </span>
        <span className="sr-only md:hidden">{t(`status.${order.status}`)}</span>
      </Link>
    </li>
  );
}

function Divider() {
  return <div className="bg-stone-catalog-line h-px w-full shrink-0" />;
}

function OrderDetail({ order }: { order: AdminOrder }) {
  const t = useTranslations("admin.orders");
  const format = useFormatter();
  const money = useAdminMoney();
  const date = format.dateTime(order.createdAt, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  return (
    <aside
      aria-labelledby="admin-order-title"
      className={cn(
        ADMIN_CARD,
        "flex flex-col gap-5 pt-7! min-[90rem]:w-[360px] min-[90rem]:shrink-0 min-[90rem]:self-stretch",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2
          id="admin-order-title"
          className="type-catalog-product-title text-stone-catalog-ink wrap-anywhere"
        >
          {t("detail.title", { number: order.number })}
        </h2>
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {[date, t(`kind.${order.kind}`)].join(" · ")}
        </p>
      </div>
      <Divider />
      <div className="flex items-center gap-4">
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {t("detail.status")}
        </p>
        <OrderChip status={order.status} />
      </div>
      <Divider />
      <p className={ADMIN_MUTED}>{t("detail.items")}</p>
      <ul className="flex list-none flex-col gap-4">
        {order.items.map((item, index) => (
          <li key={`${item.slug}-${index}`} className="flex items-center gap-4">
            <ProductImage
              image={item.image}
              fit={item.imageFit}
              className="h-[90px] w-[120px] shrink-0 rounded-lg"
              sizes="120px"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="type-catalog-product-name-sm text-stone-catalog-ink wrap-anywhere">
                {item.name}
              </p>
              <p className="type-catalog-field-value text-stone-catalog-secondary">
                {item.areaHundredths != null
                  ? t("detail.areaLine", {
                      area: format.number(item.areaHundredths / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                      price: money(item.priceCents),
                    })
                  : t("detail.line", {
                      quantity: item.quantity,
                      price: money(item.priceCents),
                    })}
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <p className={ADMIN_MUTED}>{t("detail.itemTotal")}</p>
                <p className="type-catalog-field-value text-stone-catalog-ink">
                  {money(
                    item.lineTotalCents ?? item.priceCents * item.quantity,
                  )}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Divider />
      <div className="flex items-center justify-between gap-3">
        <p className="type-catalog-product-name-lg text-stone-catalog-ink">
          {t("detail.total")}
        </p>
        <p className="type-catalog-product-title text-stone-catalog-ink">
          {money(order.totalCents)}
        </p>
      </div>
      <Divider />
      <div className="flex flex-col gap-1.5">
        <p className={ADMIN_MUTED}>{t("detail.customer")}</p>
        <p className="type-catalog-product-name-lg text-stone-catalog-ink wrap-anywhere">
          {order.customer.name}
        </p>
        <p className="type-catalog-field-value text-stone-catalog-secondary wrap-anywhere">
          {order.customer.email}
        </p>
        <a
          href={`mailto:${order.customer.email}`}
          className={cn(ADMIN_BUTTON_SECONDARY, "w-fit min-[90rem]:w-full")}
        >
          {t("detail.contact")}
          <span className="sr-only"> {order.customer.name}</span>
        </a>
      </div>
      <Divider />
      <OrderStatusForm
        key={order.number}
        number={order.number}
        status={order.status}
      />
    </aside>
  );
}

export function OrdersView({
  orders,
  selected,
  query,
}: {
  orders: AdminOrder[];
  selected: AdminOrder | null;
  query: OrdersQuery;
}) {
  const t = useTranslations("admin.orders");
  return (
    <div className="flex flex-col gap-6 min-[90rem]:flex-row min-[90rem]:items-start">
      <section
        aria-labelledby="admin-orders-title"
        className={cn(ADMIN_CARD, "flex min-w-0 flex-1 flex-col")}
      >
        <h2 id="admin-orders-title" className="sr-only">
          {t("list.title")}
        </h2>
        <OrdersToolbar query={query} />
        <div
          aria-hidden="true"
          className="bg-stone-catalog-photo type-catalog-meta text-stone-catalog-secondary flex items-center gap-4 rounded-[10px] px-5 py-3"
        >
          <span className="w-[110px] shrink-0">{t("list.order")}</span>
          <span className="min-w-0 flex-1">{t("list.item")}</span>
          <span className="w-[116px] shrink-0 max-md:hidden">
            {t("list.status")}
          </span>
          <span className="w-[80px] shrink-0 text-right">
            {t("list.total")}
          </span>
        </div>
        {orders.length === 0 ? (
          <p className="type-catalog-field-value text-stone-catalog-secondary pt-5">
            {t("none")}
          </p>
        ) : (
          <ul className="flex list-none flex-col">
            {orders.map((order) => (
              <OrderRow
                key={order.number}
                order={order}
                selected={order.number === selected?.number}
                query={query}
              />
            ))}
          </ul>
        )}
        <p className={cn(ADMIN_MUTED, "pt-5")}>
          {t("count", { count: orders.length })}
        </p>
      </section>
      {selected ? (
        <div className="flex flex-col gap-3 min-[90rem]:w-[360px] min-[90rem]:shrink-0">
          {!orders.some((order) => order.number === selected.number) && (
            <p role="status" className={ADMIN_MUTED}>
              {t("selectionOutside")}
            </p>
          )}
          <OrderDetail order={selected} />
        </div>
      ) : (
        <aside className={cn(ADMIN_CARD, "min-[90rem]:w-[360px]")}>
          <h2 className={ADMIN_CARD_TITLE}>{t("detail.none")}</h2>
        </aside>
      )}
    </div>
  );
}
