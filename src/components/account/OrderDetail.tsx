import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";
import type { OwnOrder } from "@/server/shop/queries";

import { cn } from "../cn";
import { useAccountLabels } from "./labels";
import {
  CARD,
  CARD_TITLE,
  ProductImage,
  StatusChip,
  TitleBlock,
} from "./parts";

/*
 * One order of the signed-in customer (no Figma frame: the Account cards, the Orders card typography and the
 * status chip). `placed` shows the confirmation after a test checkout; it is only reachable once the order exists.
 */
export function OrderDetail({
  order,
  placed,
}: {
  order: OwnOrder;
  placed: boolean;
}) {
  const t = useTranslations("account.orders");
  const labels = useAccountLabels();
  const format = useFormatter();
  const title = labels.title(order);
  return (
    <>
      <TitleBlock
        title={title}
        subtitle={format.dateTime(order.createdAt, {
          dateStyle: "medium",
          timeZone: "UTC",
        })}
      />
      {placed && order.kind === "test_checkout" ? (
        <div
          role="status"
          className={cn(CARD, "flex flex-col gap-1 p-(--layout-panel-pad)")}
        >
          <p className="type-catalog-product-name-lg text-stone-catalog-ink">
            {t("placed", { number: order.number })}
          </p>
          <p className="type-catalog-field-value text-stone-catalog-secondary">
            {t("placedBody")}
          </p>
        </div>
      ) : null}
      <section
        aria-labelledby="order-items"
        className={cn(CARD, "flex flex-col gap-4 p-(--layout-panel-pad)")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="order-items" className={CARD_TITLE}>
            {t("items")}
          </h2>
          <p className="flex items-center gap-2">
            <span className="type-catalog-meta text-stone-catalog-secondary">
              {t("statusLabel")}
            </span>
            <StatusChip status={order.status} />
          </p>
        </div>
        <p className="type-catalog-meta text-stone-catalog-secondary">
          {order.kind === "test_checkout" ? t("testLabel") : t("demoLabel")}
        </p>
        <ul className="border-stone-catalog-line flex list-none flex-col border-t">
          {order.items.map((item, index) => (
            <li
              key={`${item.slug}-${index}`}
              className="border-stone-catalog-line flex items-center gap-4 border-b py-3.5"
            >
              <ProductImage
                image={item.image}
                fit={item.imageFit}
                className="h-[60px] w-[104px] shrink-0 md:h-16 md:w-24"
                sizes="104px"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
                  {labels.name(item)}
                </p>
                <p className="type-catalog-meta text-stone-catalog-secondary">
                  {[labels.finish(item.finish), labels.line(item)].join(" · ")}
                </p>
              </div>
              <p className="type-catalog-field-value text-stone-catalog-ink whitespace-nowrap">
                <span className="sr-only">{t("lineTotal")} </span>
                {labels.money(labels.lineTotal(item))}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4">
          <p className="type-catalog-section text-stone-catalog-ink">
            {t("total")}
          </p>
          <p
            data-testid="order-total"
            className="type-catalog-product-name-lg text-stone-catalog-ink whitespace-nowrap"
          >
            {labels.money(order.totalCents)}
          </p>
        </div>
      </section>
      <div>
        <Button variant="outline" href="/account/orders">
          {t("all")}
        </Button>
      </div>
    </>
  );
}
