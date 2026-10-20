"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { useAccountLabels } from "@/components/account/labels";
import {
  CARD,
  CARD_TITLE,
  EmptyCard,
  ProductImage,
  TitleBlock,
} from "@/components/account/parts";
import { Button } from "@/components/buttons/Button";
import { cn } from "@/components/cn";
import { useRouter } from "@/i18n/navigation";
import { placeTestOrder } from "@/server/shop/actions";

import { createAttemptKeys, type AttemptKeys } from "./attempt-key";
import { cart, useCart, useCartReady } from "./cart-store";
import { useAreaFormat } from "./CartView";
import type { PlaceOrderCode, Quote } from "./input";
import { useQuote } from "./use-quote";

/*
 * Checkout (signed in; no Figma frame, composed from the Account cards and catalog pills). No card fields and no
 * payment provider: "Place test order" sends the cart, a per-attempt idempotency key and the total the customer
 * sees. The key is kept in memory for the page (mirrored to sessionStorage when available; see attempt-key.ts)
 * until the order is saved, so a lost response and a retry return the same order. On `prices_changed` the fresh quote replaces the summary and a second confirmation is needed. The order
 * number is shown only after the server saved it, on the order page.
 */

const DASH = "—";

export function CheckoutView({ locale }: { locale: string }) {
  const t = useTranslations("checkout");
  const labels = useAccountLabels();
  const area = useAreaFormat();
  const router = useRouter();
  const lines = useCart();
  const ready = useCartReady();
  const quote = useQuote(lines, locale);
  const content = JSON.stringify(lines);
  // A fresh quote the server answered with `prices_changed`, valid for this cart content only.
  const [fresh, setFresh] = useState<{ content: string; quote: Quote } | null>(
    null,
  );
  // One idempotency key per submission, kept in memory (and mirrored to sessionStorage when it works).
  const attempts = useRef<AttemptKeys | null>(null);
  attempts.current ??= createAttemptKeys();
  const [pending, setPending] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState<PlaceOrderCode | null>(null);

  const head = <TitleBlock title={t("title")} subtitle={t("subtitle")} />;

  if (!ready || placed) return head;
  if (lines.length === 0) {
    return (
      <>
        {head}
        <EmptyCard title={t("empty.title")} body={t("empty.body")}>
          <Button variant="outline" href="/catalog">
            {t("empty.browse")}
          </Button>
        </EmptyCard>
      </>
    );
  }

  const changed = fresh?.content === content ? fresh.quote : null;
  const shown: Quote | null =
    changed ?? (quote.status === "ok" && !quote.stale ? quote.quote : null);
  const orderable = shown !== null && shown.orderable;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !shown || !orderable) return;
    setPending(true);
    setError(null);
    try {
      const result = await placeTestOrder({
        items: lines,
        key: attempts.current!.keyFor(content),
        expectedTotalCents: shown.totalCents,
      });
      if (result.ok) {
        attempts.current!.forget();
        setPlaced(true);
        cart.clear();
        router.push(`/account/orders/${result.number}?placed=1`);
        return;
      }
      if (result.code === "prices_changed") {
        setFresh({ content, quote: result.quote });
      } else {
        if (result.code === "conflict") attempts.current!.forget();
        setError(result.code);
      }
    } catch {
      setError("generic");
    }
    setPending(false);
  };

  return (
    <>
      {head}
      <p
        role="note"
        className={cn(
          CARD,
          "type-catalog-field-value text-stone-catalog-ink px-(--layout-panel-pad) py-4",
        )}
      >
        {t("notice")}
      </p>
      <form
        onSubmit={submit}
        className={cn(
          CARD,
          "flex flex-col gap-4 p-(--layout-panel-pad) lg:max-w-[720px]",
        )}
      >
        <h2 className={CARD_TITLE}>{t("items")}</h2>
        <ul className="border-stone-catalog-line flex list-none flex-col border-t">
          {lines.map((line) => {
            const quoted = shown?.lines.find((l) => l.slug === line.slug);
            const name = labels.name({
              slug: line.slug,
              name: quoted?.available ? quoted.name : null,
            });
            return (
              <li
                key={line.slug}
                className="border-stone-catalog-line flex items-center gap-4 border-b py-3.5"
              >
                {quoted?.available ? (
                  <ProductImage
                    image={quoted.image}
                    fit={quoted.imageFit}
                    className="h-16 w-24 shrink-0"
                    sizes="96px"
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
                    {name}
                  </p>
                  <p className="type-catalog-meta text-stone-catalog-secondary">
                    {quoted?.available
                      ? t("line", {
                          area: area(line.areaHundredths),
                          price: labels.money(quoted.priceCents),
                        })
                      : quoted
                        ? t("errors.product_unavailable")
                        : DASH}
                  </p>
                </div>
                <p className="type-catalog-field-value text-stone-catalog-ink whitespace-nowrap">
                  {quoted?.available
                    ? labels.money(quoted.lineTotalCents)
                    : DASH}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-4">
          <p className="type-catalog-section text-stone-catalog-ink">
            {t("total")}
          </p>
          <p
            data-testid="checkout-total"
            className="type-catalog-product-name-lg text-stone-catalog-ink whitespace-nowrap"
          >
            {shown ? labels.money(shown.totalCents) : DASH}
          </p>
        </div>
        <p className="type-catalog-meta text-stone-catalog-secondary">
          {t("indicative")}
        </p>
        <div aria-live="polite">
          {changed ? (
            <p className="type-catalog-field-value text-stone-catalog-ink">
              {t("pricesChanged")}
            </p>
          ) : null}
        </div>
        {error ? (
          <p
            role="alert"
            className="type-catalog-field-value text-stone-catalog-ink"
          >
            {t(`errors.${error}`)}
          </p>
        ) : null}
        {shown && !shown.orderable ? (
          <p className="type-catalog-field-value text-stone-catalog-ink">
            {shown.tooLarge
              ? t("errors.too_large")
              : t("errors.product_unavailable")}
          </p>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Button
            type="submit"
            variant="graphite-solid"
            loading={pending}
            disabled={!orderable}
            className="w-full md:w-auto"
          >
            {changed ? t("confirmNew") : t("place")}
          </Button>
          <Button variant="outline" href="/cart" className="w-full md:w-auto">
            {t("back")}
          </Button>
        </div>
      </form>
    </>
  );
}
