"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

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
import { TextField } from "@/components/forms/TextField";
import { Link } from "@/i18n/navigation";
import { LIMITS } from "@/lib/calculator";

import { cart, useCart, useCartReady } from "./cart-store";
import { parseArea, type CartLine, type QuoteLine } from "./input";
import { useQuote } from "./use-quote";

/*
 * Cart (no Figma frame: composed from the Account cards, the catalog light surface, TextField/light and the
 * catalog pills). Lines come from localStorage; names, prices and totals from the server's quote. A line whose
 * product is gone is flagged and blocks checkout until it is removed; so does an area that does not parse.
 */

const DASH = "—";

export function useAreaFormat() {
  const format = useFormatter();
  return (hundredths: number) =>
    format.number(hundredths / 100, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

function LineRow({
  line,
  quoted,
  onValidity,
}: {
  line: CartLine;
  quoted: QuoteLine | undefined;
  onValidity: (slug: string, valid: boolean) => void;
}) {
  const t = useTranslations("cart");
  const labels = useAccountLabels();
  const format = useFormatter();
  const area = useAreaFormat();
  const [draft, setDraft] = useState(() => area(line.areaHundredths));
  const [error, setError] = useState<string | undefined>();
  const name = labels.name({
    slug: line.slug,
    name: quoted?.available ? quoted.name : null,
  });

  const check = (value: string) => {
    const parsed = parseArea(value);
    onValidity(line.slug, parsed.ok);
    if (parsed.ok) {
      if (parsed.hundredths !== line.areaHundredths)
        cart.setArea(line.slug, parsed.hundredths);
      return undefined;
    }
    if (parsed.reason === "invalid") return t("error.invalid");
    return t("error.range", {
      min: format.number(LIMITS.area[0]),
      max: format.number(LIMITS.area[1]),
    });
  };

  return (
    <li
      className={cn(
        CARD,
        "flex flex-col gap-4 p-(--layout-panel-pad) md:flex-row md:items-start md:gap-6",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4 md:gap-6">
        {quoted?.available ? (
          <ProductImage
            image={quoted.image}
            fit={quoted.imageFit}
            className="h-[60px] w-[104px] shrink-0 md:h-[92px] md:w-40"
            sizes="160px"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-stone-catalog-ink [font-family:var(--font-display)] text-[20px] leading-7 font-normal wrap-anywhere">
            <Link
              href={`/catalog/${line.slug}`}
              className="focusv:outline-2 focusv:outline-accent-focus rounded-sm outline-0"
            >
              {name}
            </Link>
          </h2>
          {quoted?.available ? (
            <p className="type-catalog-meta text-stone-catalog-secondary">
              {[
                labels.finish(quoted.finish),
                t("perSquareMetre", { price: labels.money(quoted.priceCents) }),
              ].join(" · ")}
            </p>
          ) : quoted ? (
            <p className="type-catalog-field-value text-stone-catalog-ink">
              {t("unavailable")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 md:w-[220px] md:shrink-0">
        <TextField
          tone="light"
          name={`area-${line.slug}`}
          label={t("area")}
          unit={t("areaUnit")}
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          onChange={(value) => {
            setDraft(value);
            const parsed = parseArea(value);
            onValidity(line.slug, parsed.ok);
            if (parsed.ok) {
              setError(undefined);
              if (parsed.hundredths !== line.areaHundredths)
                cart.setArea(line.slug, parsed.hundredths);
            }
          }}
          onBlur={() => setError(check(draft))}
          error={error}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="type-catalog-meta text-stone-catalog-secondary">
            {t("lineTotal")}
          </p>
          <p className="type-catalog-field-value text-stone-catalog-ink whitespace-nowrap">
            {quoted?.available ? labels.money(quoted.lineTotalCents) : DASH}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            onValidity(line.slug, true);
            cart.remove(line.slug);
          }}
        >
          <span aria-hidden="true">{t("remove")}</span>
          <span className="sr-only">{t("removeLabel", { name })}</span>
        </Button>
      </div>
    </li>
  );
}

export function CartView({ locale }: { locale: string }) {
  const t = useTranslations("cart");
  const labels = useAccountLabels();
  const lines = useCart();
  const ready = useCartReady();
  const quote = useQuote(lines, locale);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());

  const onValidity = (slug: string, valid: boolean) =>
    setInvalid((current) => {
      if (valid === !current.has(slug)) return current;
      const next = new Set(current);
      if (valid) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const head = <TitleBlock title={t("title")} subtitle={t("subtitle")} />;

  if (!ready) {
    return (
      <>
        {head}
        <p
          role="status"
          className="type-catalog-field-value text-stone-catalog-secondary"
        >
          {t("loading")}
        </p>
      </>
    );
  }
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

  const ok = quote.status === "ok" ? quote.quote : null;
  const byslug = new Map(ok?.lines.map((l) => [l.slug, l]));
  const blocked =
    invalid.size > 0 ||
    (ok !== null && !ok.orderable) ||
    lines.some((l) => !byslug.has(l.slug) && ok !== null);
  const canCheckout = ok !== null && !blocked;

  return (
    <>
      {head}
      <div className="flex flex-col gap-(--layout-section-gap) lg:flex-row lg:items-start lg:gap-(--layout-card-gap)">
        <ul
          aria-label={t("list")}
          className="flex min-w-0 flex-1 list-none flex-col gap-(--layout-section-gap)"
        >
          {lines.map((line) => (
            <LineRow
              key={line.slug}
              line={line}
              quoted={byslug.get(line.slug)}
              onValidity={onValidity}
            />
          ))}
        </ul>
        <section
          aria-labelledby="cart-summary"
          className={cn(
            CARD,
            "flex flex-col gap-4 p-(--layout-panel-pad) lg:w-[360px] lg:shrink-0",
          )}
        >
          <h2 id="cart-summary" className={CARD_TITLE}>
            {t("summary")}
          </h2>
          <div className="bg-stone-catalog-line h-px w-full" />
          <div className="flex items-center justify-between gap-4">
            <p className="type-catalog-section text-stone-catalog-ink">
              {t("total")}
            </p>
            <p
              data-testid="cart-total"
              aria-live="polite"
              className="type-catalog-product-name-lg text-stone-catalog-ink whitespace-nowrap"
            >
              {ok ? labels.money(ok.totalCents) : DASH}
            </p>
          </div>
          <p className="type-catalog-meta text-stone-catalog-secondary">
            {t("indicative")}
          </p>
          {quote.status === "error" ? (
            <p
              role="alert"
              className="type-catalog-meta text-stone-catalog-ink"
            >
              {t("error.quote")}
            </p>
          ) : null}
          {blocked ? (
            <p className="type-catalog-meta text-stone-catalog-ink">
              {ok?.tooLarge ? t("amountTooLarge") : t("blocked")}
            </p>
          ) : null}
          {canCheckout ? (
            <Button
              variant="graphite-solid"
              href="/checkout"
              className="w-full"
            >
              {t("checkout")}
            </Button>
          ) : (
            <Button variant="graphite-solid" disabled className="w-full">
              {t("checkout")}
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
