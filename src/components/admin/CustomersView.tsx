import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { AdminCustomers } from "@/server/admin/customer-queries";
import type { AdminOrder } from "@/server/admin/queries";

import { Avatar, ProductImage } from "../account/parts";
import { cn } from "../cn";
import { CustomerRoleForm } from "./CustomerRoleForm";
import { AdminSearch } from "./fields";
import { FilterForm } from "./FilterForm";
import { useAdminMoney } from "./money";
import {
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
  StatusChip,
} from "./parts";

function CustomerOrder({ order }: { order: AdminOrder }) {
  const t = useTranslations("admin.customers");
  const orders = useTranslations("admin.orders");
  const format = useFormatter();
  const money = useAdminMoney();
  const first = order.items[0];
  return (
    <li className="border-stone-catalog-line flex flex-wrap items-center gap-x-6 gap-y-3 border-b py-4">
      <div className="flex w-[150px] shrink-0 flex-col gap-1">
        <p className="type-catalog-product-name-sm text-stone-catalog-ink">
          {order.number}
        </p>
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {format.dateTime(order.createdAt, {
            dateStyle: "medium",
            timeZone: "UTC",
          })}
        </p>
      </div>
      <div className="flex min-w-[220px] flex-1 items-center gap-4">
        {first && (
          <ProductImage
            image={first.image}
            fit={first.imageFit}
            className="h-16 w-20 shrink-0 rounded-lg"
            sizes="80px"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
            {first?.name ?? orders("noItems")}
          </p>
          {first && (
            <p className={ADMIN_MUTED}>
              {orders("detail.line", {
                quantity: first.quantity,
                price: money(first.priceCents),
              })}
            </p>
          )}
          {order.items.length > 1 && (
            <p className={ADMIN_MUTED}>
              {orders("more", { count: order.items.length - 1 })}
            </p>
          )}
        </div>
      </div>
      <StatusChip
        tone={order.status === "delivered" ? "fulfilled" : "processing"}
      >
        {orders(`status.${order.status}`)}
      </StatusChip>
      <div className="flex flex-wrap items-center gap-4">
        <p className={ADMIN_CARD_TITLE}>{money(order.totalCents)}</p>
        <Link
          href={{
            pathname: "/admin/orders",
            query: { q: order.number, order: order.number },
          }}
          className={ADMIN_BUTTON_SECONDARY}
        >
          {t("viewOrder")}
          <span className="sr-only"> {order.number}</span>
        </Link>
      </div>
    </li>
  );
}

/** Customers 1440 1077:53004 / 1024 1077:56114: split cards, stacked below 1440. */
export function CustomersView({
  data,
  actorId,
}: {
  data: AdminCustomers;
  actorId: string;
}) {
  const t = useTranslations("admin.customers");
  const { customers, selected, orders, q, page, pages, total } = data;
  const search = (nextPage: number, customer?: string) => ({
    ...(q ? { q } : {}),
    ...(nextPage > 1 ? { page: String(nextPage) } : {}),
    ...(customer ? { customer } : {}),
  });
  return (
    <div className="flex min-w-0 flex-col items-start gap-6 min-[90rem]:flex-row">
      <section
        aria-labelledby="customers-list-title"
        className={cn(
          ADMIN_CARD,
          "flex w-full min-w-0 shrink-0 flex-col gap-3 px-5! py-6! min-[90rem]:w-[380px]",
        )}
      >
        <h2 id="customers-list-title" className={ADMIN_CARD_TITLE}>
          {t("title")}
        </h2>
        <FilterForm className="w-full">
          <AdminSearch
            label={t("searchLabel")}
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="flex-1"
          />
        </FilterForm>
        {customers.length ? (
          <ul className="flex list-none flex-col gap-1 pt-2">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={{
                    pathname: "/admin/customers",
                    query: search(page, customer.id),
                  }}
                  aria-current={
                    customer.id === selected?.id ? "true" : undefined
                  }
                  className={cn(
                    "motion-hover focusv:outline-2 focusv:-outline-offset-2 focusv:outline-ink-primary border-stone-catalog-line relative flex min-w-0 items-center gap-3.5 border-b px-3.5 py-3 outline-0",
                    customer.id === selected?.id
                      ? "bg-stone-catalog-photo rounded-[10px]"
                      : "hov:bg-overlay-tint-10",
                  )}
                >
                  {customer.id === selected?.id && (
                    <span
                      aria-hidden="true"
                      className="bg-stone-catalog-ink absolute top-5 left-0 h-11 w-[3px] rounded-[2px]"
                    />
                  )}
                  {customer.thumbnail ? (
                    <ProductImage
                      image={customer.thumbnail.image}
                      fit={customer.thumbnail.imageFit}
                      className="size-14 shrink-0 rounded-lg"
                      sizes="56px"
                    />
                  ) : (
                    <Avatar
                      initials={Array.from(
                        customer.name.trim() || customer.email,
                      )
                        .slice(0, 2)
                        .join("")
                        .toLocaleUpperCase()}
                      tone="milk"
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-catalog-product-name-sm text-stone-catalog-ink wrap-anywhere">
                      {customer.name}
                    </span>
                    <span className={cn(ADMIN_MUTED, "wrap-anywhere")}>
                      {customer.email}
                    </span>
                    <StatusChip tone="draft">
                      {t(`roles.${customer.role}`)}
                    </StatusChip>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(ADMIN_MUTED, "py-4")}>{t("none")}</p>
        )}
        <p className={cn(ADMIN_MUTED, "pt-3")}>
          {t("count", { count: total })}
        </p>
        {pages > 1 && (
          <nav
            aria-label={t("pagination")}
            className="flex flex-wrap items-center gap-3"
          >
            {page > 1 && (
              <Link
                href={{ pathname: "/admin/customers", query: search(page - 1) }}
                className={ADMIN_BUTTON_SECONDARY}
              >
                {t("previous")}
              </Link>
            )}
            <span className={ADMIN_MUTED}>{t("page", { page, pages })}</span>
            {page < pages && (
              <Link
                href={{ pathname: "/admin/customers", query: search(page + 1) }}
                className={ADMIN_BUTTON_SECONDARY}
              >
                {t("next")}
              </Link>
            )}
          </nav>
        )}
      </section>
      <section
        aria-labelledby="customer-detail-title"
        className={cn(
          ADMIN_CARD,
          "flex w-full min-w-0 flex-1 flex-col gap-5 px-9! py-8!",
        )}
      >
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2
                  id="customer-detail-title"
                  className="type-catalog-page-title-56 text-stone-catalog-ink wrap-anywhere"
                >
                  {selected.name}
                </h2>
                <p className="type-catalog-field-value text-stone-catalog-secondary wrap-anywhere">
                  {selected.email}
                </p>
              </div>
              <a
                href={`mailto:${selected.email}`}
                className={ADMIN_BUTTON_SECONDARY}
              >
                {t("contact")}
              </a>
            </div>
            <div className="border-stone-catalog-line border-y py-5">
              {selected.id === actorId ? (
                <div className="flex flex-col gap-2">
                  <p className="type-catalog-field-value text-stone-catalog-ink flex gap-2">
                    <span>{t("role")}</span>
                    <span>{t(`roles.${selected.role}`)}</span>
                  </p>
                  <p className={ADMIN_MUTED}>{t("ownRole")}</p>
                </div>
              ) : (
                <CustomerRoleForm
                  key={selected.id}
                  id={selected.id}
                  role={selected.role}
                />
              )}
            </div>
            <h3 className="type-catalog-product-title text-stone-catalog-ink">
              {t("orders")}
            </h3>
            {orders.length ? (
              <ul className="list-none">
                {orders.map((order) => (
                  <CustomerOrder key={order.number} order={order} />
                ))}
              </ul>
            ) : (
              <p className={ADMIN_MUTED}>{t("noOrders")}</p>
            )}
            {orders.length === 500 && (
              <p className={ADMIN_MUTED}>{t("ordersLimit")}</p>
            )}
          </>
        ) : (
          <h2 id="customer-detail-title" className={ADMIN_CARD_TITLE}>
            {t("selectCustomer")}
          </h2>
        )}
      </section>
    </div>
  );
}
