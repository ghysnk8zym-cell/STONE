"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/components/cn";
import { TextField } from "@/components/forms/TextField";
import {
  calculate,
  LIMITS,
  type CalcField,
  type CalcResult,
} from "@/lib/calculator";

type Mode = "area" | "wall";

const DASH = "—";

/*
 * Cost calculator (Figma Product/Calculator 779:628; modes Area 779:547, Wall dimensions 779:584).
 * Card: stone/catalog-card fill, 1 px catalog-line border, radius 20, padding --layout-panel-pad
 * (16 / 20 / 24 / 24 px), gap 20. Head: title 26/32 (Product name style) and the "Area pricing" note
 * 14/20; Switch: 1 px line pill, padding 4, gap 4, two 44 px segments (active: graphite gradient
 * #4c5053 -> #414448 with white 15/20 medium label, inactive: ink); Inputs row (gap 16 in Wall mode);
 * divider; Breakdown rows 15/20 with secondary labels and ink values; note 14/20 secondary; Total:
 * "Estimated total" 20/28 + "Illustrative estimate" 14/20 and the amount at 40/48.
 *
 * Initial state is Area "2.00", so the server renders the Figma default ($528.00 for the 240 USD/m2
 * placeholder price) without JavaScript. The wall mode starts at 2.00 x 1.00 (Figma), i.e. the same
 * 2 m2, so switching keeps the total. Mode switch: the Figma smart-animate is not reproduced.
 * The segments are two `aria-pressed` buttons in a labelled group (a radiogroup would need arrow-key
 * handling for no gain with two options). The breakdown and total form one polite live region.
 */
const SEGMENT = cn(
  "flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full outline-0 type-catalog-action motion-hover",
  "focusv:outline-2 focusv:outline-offset-2 focusv:outline-ink-primary",
);
const SEGMENT_ON =
  "bg-linear-to-b from-[#4c5053] to-[#414448] text-primary cursor-default";
const SEGMENT_OFF = "text-stone-catalog-ink hov:bg-overlay-tint-10";

type Values = { area: string; length: string; height: string };

export function Calculator({
  unitCents,
  isPlaceholder,
}: {
  unitCents: number;
  isPlaceholder: true;
}) {
  const t = useTranslations("pages.product.calculator");
  const price = useTranslations("components.price");
  const format = useFormatter();

  const [mode, setMode] = useState<Mode>("area");
  const [values, setValues] = useState<Values>({
    area: "2.00",
    length: "2.00",
    height: "1.00",
  });

  const result: CalcResult =
    mode === "area"
      ? calculate({ mode, area: values.area }, unitCents)
      : calculate(
          { mode, length: values.length, height: values.height },
          unitCents,
        );

  const money = (cents: number) =>
    format.number(cents / 100, { style: "currency", currency: "USD" });
  const area = (m2: number) =>
    `${format.number(m2, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("units.area")}`;

  const errorFor = (field: CalcField): string | undefined => {
    if (result.ok || result.field !== field) return undefined;
    if (result.reason === "invalid") return t("error.invalid");
    const [min, max] = LIMITS[field];
    return t("error.range", {
      min: format.number(min),
      max: format.number(max),
    });
  };

  const field = (name: CalcField) => (
    <TextField
      key={name}
      tone="light"
      name={name}
      label={t(`fields.${name}`)}
      unit={t(`units.${name}`)}
      inputMode="decimal"
      autoComplete="off"
      value={values[name]}
      onChange={(value) => setValues((v) => ({ ...v, [name]: value }))}
      error={errorFor(name)}
    />
  );

  const rows: { key: string; label: string; value: string }[] = [
    {
      key: "surface",
      label: t("rows.surface"),
      value: result.ok ? area(result.surfaceM2) : DASH,
    },
    {
      key: "extra",
      label: t("rows.extra"),
      value: result.ok ? `+${area(result.extraM2)}` : DASH,
    },
    {
      key: "order",
      label: t("rows.order"),
      value: result.ok ? area(result.orderM2) : DASH,
    },
    {
      key: "unitPrice",
      label: t("rows.unitPrice"),
      value: `${money(unitCents)} ${price("perSquareMetre")}`,
    },
  ];

  return (
    <section className="bg-stone-catalog-card border-stone-catalog-line flex w-full flex-col gap-5 rounded-[20px] border p-(--layout-panel-pad)">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 className="text-stone-catalog-ink type-catalog-product-name-lg">
          {t("title")}
        </h2>
        <p className="type-catalog-meta text-stone-catalog-secondary">
          {t("pricingNote")}
        </p>
      </div>

      <div
        role="group"
        aria-label={t("modesLabel")}
        className="border-stone-catalog-line flex w-full gap-1 rounded-full border p-1"
      >
        {(["area", "wall"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(SEGMENT, mode === m ? SEGMENT_ON : SEGMENT_OFF)}
          >
            <span className="truncate">{t(`modes.${m}`)}</span>
          </button>
        ))}
      </div>

      <div className="flex w-full items-start gap-4 [&>*]:min-w-0 [&>*]:flex-1">
        {mode === "area" ? (
          field("area")
        ) : (
          <>
            {field("length")}
            {field("height")}
          </>
        )}
      </div>

      <div className="bg-stone-catalog-line h-px w-full" />

      <div
        data-testid="calculator-result"
        aria-live="polite"
        className="flex w-full flex-col gap-5"
      >
        <dl className="type-catalog-meta-lg m-0 flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-stone-catalog-secondary">{row.label}</dt>
              <dd className="text-stone-catalog-ink m-0 text-right whitespace-nowrap">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="type-catalog-meta text-stone-catalog-secondary">
          {t("note")}
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="type-catalog-section text-stone-catalog-ink">
              {t("estimatedTotal")}
            </p>
            {isPlaceholder ? (
              <p className="type-catalog-meta text-stone-catalog-secondary">
                {t("illustrative")}
              </p>
            ) : null}
          </div>
          <p
            data-testid="calculator-total"
            className="type-catalog-product-title text-stone-catalog-ink text-right whitespace-nowrap"
          >
            {result.ok ? money(result.totalCents) : DASH}
          </p>
        </div>
      </div>
    </section>
  );
}
