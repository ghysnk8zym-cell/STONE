import { useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";
import { Link } from "@/i18n/navigation";
import type { AccountOrder } from "@/server/account/queries";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import { useAccountLabels } from "./labels";
import {
  BlockHeader,
  CARD,
  CARD_TITLE,
  EmptyCard,
  ProductImage,
  StatusChip,
} from "./parts";

/*
 * Order blocks of the Account screens. All orders are demo rows of the seed (checkout does not exist), so the
 * Orders screen says "Demo order D-1048" like Figma. Nothing here links to a single order: Figma draws no
 * order screen, so "View order" is inert (the Phase 3 pattern for controls without a destination) and the
 * Overview rows lead to the Orders list.
 */

/** "Black Marble · Polished · Quantity 1", with " · +2 more" when the order holds more items. */
function useItemLine() {
  const labels = useAccountLabels();
  const t = useTranslations("account.orders");
  return (order: AccountOrder) => {
    const [first] = order.items;
    if (!first) return "";
    const parts = [
      labels.name(first),
      labels.finish(first.finish),
      labels.quantity(first.quantity),
    ];
    if (order.items.length > 1) {
      parts.push(t("more", { count: order.items.length - 1 }));
    }
    return parts.join(" · ");
  };
}

function Money({ cents }: { cents: number }) {
  const labels = useAccountLabels();
  const t = useTranslations("components.price");
  return (
    <>
      {labels.money(cents)} <span className="sr-only">{t("illustrative")}</span>
    </>
  );
}

/** Account/Order row 819:538: thumb 96 x 64, order, meta, price, status chip, chevron (92 px high). */
function OrderRow({ order }: { order: AccountOrder }) {
  const t = useTranslations("account.orders");
  const itemLine = useItemLine();
  const first = order.items[0];
  return (
    <li className="border-stone-catalog-line border-t first:border-t-0">
      <Link
        href="/account/orders"
        className="focusv:outline-2 focusv:-outline-offset-2 focusv:outline-accent-focus flex h-[92px] items-center gap-4 py-3.5 outline-0"
      >
        {first ? (
          <ProductImage
            image={first.image}
            fit={first.imageFit}
            className="h-16 w-24 shrink-0"
            sizes="96px"
          />
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-catalog-field-value text-stone-catalog-ink truncate">
            {t("demoOrder", { number: order.number })}
          </span>
          <span className="type-catalog-meta text-stone-catalog-secondary truncate">
            {itemLine(order)}
          </span>
          <span className="type-catalog-field-value text-stone-catalog-ink">
            <Money cents={order.totalCents} />
          </span>
        </span>
        <StatusChip status={order.status} className="inline-flex shrink-0" />
        <Icon
          name="chevron-right"
          className="text-stone-catalog-secondary shrink-0"
        />
      </Link>
    </li>
  );
}

/** Account/Orders block 819:548 (from 1024): "My orders", the All orders link and the two latest orders. */
/** `className` carries the display (the page shows it from 1024: `hidden lg:flex`). */
export function OrdersBlock({
  orders,
  className,
}: {
  orders: AccountOrder[];
  className?: string;
}) {
  const t = useTranslations("account.overview.orders");
  return (
    <section
      className={cn(CARD, "flex-col gap-2 px-7 py-6", className)}
      aria-label={t("title")}
    >
      <BlockHeader
        title={t("title")}
        linkLabel={t("all")}
        href="/account/orders"
      />
      {orders.length === 0 ? (
        <p className="type-catalog-field-value text-stone-catalog-secondary border-stone-catalog-line border-t py-4">
          {t("empty")}
        </p>
      ) : (
        <ul className="border-stone-catalog-line flex list-none flex-col border-t">
          {orders.map((order) => (
            <OrderRow key={order.number} order={order} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Card / Current order 737:6438 (below 1024): the order in progress, or the latest one. */
export function CurrentOrderCard({
  order,
  className,
}: {
  order: AccountOrder | undefined;
  className?: string;
}) {
  const t = useTranslations("account.overview.orders");
  const orders = useTranslations("account.orders");
  const labels = useAccountLabels();
  const first = order?.items[0];
  if (!order || !first) {
    return (
      <section
        className={cn(CARD, "p-(--layout-panel-pad)", className)}
        aria-label={t("current")}
      >
        <h2 className={CARD_TITLE}>{t("current")}</h2>
        <p className="type-catalog-field-value text-stone-catalog-secondary mt-2">
          {t("empty")}
        </p>
      </section>
    );
  }
  return (
    <section
      className={cn(
        CARD,
        "flex flex-col items-start gap-4 p-(--layout-panel-pad)",
        className,
      )}
      aria-label={t("current")}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className={CARD_TITLE}>{t("current")}</h2>
        <p className="type-catalog-meta text-stone-catalog-secondary">
          {t("demoOrder", { number: order.number })}
        </p>
      </div>
      <div className="flex w-full items-center gap-4">
        <ProductImage
          image={first.image}
          fit={first.imageFit}
          className="h-[72px] w-[124px] shrink-0"
          sizes="124px"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-catalog-field-value text-stone-catalog-ink">
            {labels.name(first)}
          </p>
          <p className="type-catalog-meta text-stone-catalog-secondary">
            {labels.detail(first)}
          </p>
          <p className="type-catalog-field-value text-stone-catalog-ink">
            <Money cents={order.totalCents} />
          </p>
        </div>
      </div>
      <div className="bg-stone-catalog-line h-px w-full" />
      <div className="flex flex-col gap-0.5">
        <p className="type-catalog-field-value text-stone-catalog-ink">
          {orders(`status.${order.status}`)}
        </p>
        <p className="type-catalog-meta text-stone-catalog-secondary">
          {t("demoData")}
        </p>
      </div>
      <Button variant="graphite-solid" inert className="min-w-[120px]">
        {t("view")}
      </Button>
    </section>
  );
}

/** Row / All orders 737:6460 (below 1024): a full-width card that leads to the Orders list. */
export function AllOrdersRow({ className }: { className?: string }) {
  const t = useTranslations("account.overview.orders");
  return (
    <Link
      href="/account/orders"
      className={cn(
        CARD,
        "focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus flex items-center gap-4 px-(--layout-panel-pad) py-[18px] outline-0",
        className,
      )}
    >
      <Icon name="orders" className="text-stone-catalog-ink" />
      <span className="type-catalog-field-value text-stone-catalog-ink min-w-0 flex-1">
        {t("all")}
      </span>
      <Icon name="arrow" className="text-stone-catalog-ink" />
    </Link>
  );
}

/*
 * Card / Order D-1048 (Orders 1440 742:7433, 390 742:7810). From 768 a row: thumb 160 x 92, the order text
 * (Lusitana 20/28 title, name 16/22, finish and quantity 14/20, price 16/22) and a column at the right with
 * the status and the View order button; below 768 a column: the item row (thumb 104 x 60) and under it the status
 * text with the button. The status is a chip from 1024, plain 16/22 text below (Orders 768 742:7607).
 */
export function OrderCard({ order }: { order: AccountOrder }) {
  const t = useTranslations("account.orders");
  const labels = useAccountLabels();
  const first = order.items[0];
  const status = t(`status.${order.status}`);
  return (
    <li
      className={cn(
        CARD,
        "flex flex-col gap-4 p-(--layout-panel-pad) md:flex-row md:items-center md:gap-6",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
        {first ? (
          <ProductImage
            image={first.image}
            fit={first.imageFit}
            className="h-[60px] w-[104px] shrink-0 md:h-[92px] md:w-40"
            sizes="160px"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-stone-catalog-ink [font-family:var(--font-display)] text-[20px] leading-7 font-normal wrap-anywhere">
            {t("demoOrder", { number: order.number })}
          </h2>
          {first ? (
            <>
              <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
                {labels.name(first)}
                {order.items.length > 1
                  ? ` · ${t("more", { count: order.items.length - 1 })}`
                  : ""}
              </p>
              <p className="type-catalog-meta text-stone-catalog-secondary">
                {labels.detail(first)}
              </p>
            </>
          ) : null}
          <p className="type-catalog-field-value text-stone-catalog-ink">
            <Money cents={order.totalCents} />
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 md:shrink-0 md:flex-col md:items-end md:gap-2.5">
        <p className="type-catalog-field-value text-stone-catalog-ink lg:hidden">
          {status}
        </p>
        <StatusChip status={order.status} className="hidden lg:inline-flex" />
        <Button variant="graphite-solid" inert className="min-w-[120px]">
          {t("view")}
        </Button>
      </div>
    </li>
  );
}

export function OrdersEmpty() {
  const t = useTranslations("account.orders.empty");
  return (
    <EmptyCard title={t("title")} body={t("body")}>
      <Button variant="outline" href="/catalog">
        {t("browse")}
      </Button>
    </EmptyCard>
  );
}
