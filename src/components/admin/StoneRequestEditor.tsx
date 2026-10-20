"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  REQUEST_QUOTE_MAX_CENTS,
  STONE_REQUEST_STATUSES,
  type StoneRequestSnapshot,
  type StoneRequestStatus,
  type StoneRequestResult,
} from "@/features/admin/stone-requests";
import { Link, useRouter } from "@/i18n/navigation";
import {
  saveStoneRequestQuote,
  setStoneRequestStatus,
} from "@/server/admin/stone-request-actions";
import type { AdminStoneRequest } from "@/server/admin/stone-request-queries";
import { ProductImage } from "../account/parts";
import { ReferencePhoto } from "../stone-requests/ReferencePhoto";
import { AdminInput, AdminSelect } from "./fields";
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
} from "./parts";
import { centsToDollars, dollarsToCents } from "./product-form-values";
import { useAdminMoney } from "./money";
import { StoneRequestStatus as StatusChip } from "./StoneRequestStatus";

/** Key by request id, never revision: a refresh must not silently rebase an unsaved draft. */
export function StoneRequestEditor({
  request,
}: {
  request: AdminStoneRequest;
}) {
  const t = useTranslations("admin.createYourStone");
  const catalog = useTranslations("catalog");
  const submission = useTranslations("stoneRequest");
  const router = useRouter();
  const format = useFormatter();
  const money = useAdminMoney();
  const [snapshot, setSnapshot] = useState<StoneRequestSnapshot>({
    revision: request.revision,
    status: request.status,
    quoteUnitPriceCents: request.quoteUnitPriceCents,
  });
  const [price, setPrice] = useState(
    centsToDollars(request.quoteUnitPriceCents),
  );
  const [status, setStatus] = useState<StoneRequestStatus>(request.status);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [priceError, setPriceError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const cents = dollarsToCents(price);
  const validPrice = cents !== null && cents <= REQUEST_QUOTE_MAX_CENTS;
  const label = (kind: "material" | "color" | "finish", value: string) =>
    catalog.has(`${kind}.${value}` as never)
      ? catalog(`${kind}.${value}` as never)
      : value;
  function perform(action: () => Promise<StoneRequestResult>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          setMessage({ ok: false, text: t(`errors.${result.code}`) });
          return;
        }
        setSnapshot(result.snapshot);
        setStatus(result.snapshot.status);
        setMessage({ ok: true, text: success });
      } catch {
        setMessage({ ok: false, text: t("errors.generic") });
        return;
      }
      router.refresh();
    });
  }
  return (
    <section
      aria-labelledby="stone-request-title"
      className="flex min-w-0 flex-1 flex-col gap-6 p-6 min-[90rem]:p-9"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <h2
              id="stone-request-title"
              className="text-stone-catalog-ink [font-family:var(--font-display)] text-[36px] leading-[44px] min-[90rem]:text-[40px] min-[90rem]:leading-[48px]"
            >
              {t("request", { number: request.number })}
            </h2>
            <StatusChip status={snapshot.status} />
          </div>
          <p className={ADMIN_MUTED}>
            {format.dateTime(new Date(request.createdAt), {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
          </p>
        </div>
      </div>
      <div className="border-stone-catalog-line flex flex-wrap items-center justify-between gap-3 border-y py-6">
        <div className="min-w-0">
          <p className={ADMIN_MUTED}>{t("customer")}</p>
          <p className={`${ADMIN_CARD_TITLE} mt-1 wrap-anywhere`}>
            {request.customer.name}
          </p>
          <p className={`${ADMIN_MUTED} wrap-anywhere`}>
            {request.customer.email}
          </p>
          <Link
            href={{
              pathname: "/admin/customers",
              query: {
                q: request.customer.email,
                customer: request.customer.id,
              },
            }}
            className="type-catalog-meta text-stone-catalog-ink focusv:outline-2 focusv:outline-offset-2 focusv:outline-ink-primary mt-2 inline-block underline underline-offset-4"
          >
            {t("viewCustomer")}
          </Link>
        </div>
        <button
          type="button"
          disabled
          title={t("contactUnavailable")}
          className={ADMIN_BUTTON_SECONDARY}
        >
          {t("contact")}
        </button>
      </div>
      {request.contactName && (
        <div className="flex flex-col gap-1">
          <h3 className={ADMIN_CARD_TITLE}>{submission("contact")}</h3>
          <p className={`${ADMIN_MUTED} wrap-anywhere`}>
            {request.contactName}
          </p>
          <p className={`${ADMIN_MUTED} wrap-anywhere`}>
            {request.contactEmail}
          </p>
          {request.contactPhone && (
            <p className={`${ADMIN_MUTED} wrap-anywhere`}>
              {request.contactPhone}
            </p>
          )}
        </div>
      )}
      <div className="grid min-w-0 grid-cols-1 gap-8 min-[90rem]:grid-cols-2 min-[90rem]:gap-10">
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className={ADMIN_CARD_TITLE}>{t("reference")}</h3>
          {request.hasPhoto ? (
            <ReferencePhoto
              src={`/api/stone-requests/${request.id}/photo`}
              alt={t("reference")}
              className="h-[320px] w-full rounded-xl"
            />
          ) : request.referenceImage ? (
            <ProductImage
              image={request.referenceImage}
              fit="contain"
              className="h-[320px] w-full rounded-xl"
              sizes="(min-width: 1440px) 320px, 700px"
            />
          ) : (
            <p className={ADMIN_MUTED}>{t("noReference")}</p>
          )}
          <p className={ADMIN_MUTED}>
            {request.hasPhoto ? submission("photoHelp") : t("referenceHint")}
          </p>
        </div>
        <div className="border-stone-catalog-line flex min-w-0 flex-col gap-4 min-[90rem]:border-l min-[90rem]:pl-10">
          <h3 className={ADMIN_CARD_TITLE}>{t("specifications")}</h3>
          <dl className="flex flex-col gap-5">
            {[
              ["material", request.name],
              ["length", t("millimetres", { value: request.lengthMm })],
              ["width", t("millimetres", { value: request.widthMm })],
              ["thickness", t("millimetres", { value: request.thicknessMm })],
              ["color", label("color", request.color)],
              ["finish", label("finish", request.finish)],
              ["quantity", t("pieces", { count: request.quantity })],
            ].map(([key, value]) => (
              <div key={key} className="grid min-w-0 grid-cols-2 gap-4">
                <dt className={ADMIN_MUTED}>{t(key as "material")}</dt>
                <dd className="type-catalog-meta text-stone-catalog-ink wrap-anywhere">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <form
        aria-labelledby="stone-quote-title"
        onSubmit={(event) => {
          event.preventDefault();
          setPriceError(undefined);
          if (!validPrice) {
            setPriceError(t("errors.price"));
            return;
          }
          perform(
            () =>
              saveStoneRequestQuote({
                id: request.id,
                revision: snapshot.revision,
                quoteUnitPriceCents: cents,
              }),
            t("saved"),
          );
        }}
        className="border-stone-catalog-line flex flex-col gap-4 border-t pt-6"
      >
        <h3 id="stone-quote-title" className={ADMIN_CARD_TITLE}>
          {t("draft")}
        </h3>
        <p className={ADMIN_MUTED}>{t("draftHint")}</p>
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 items-end gap-6 min-[90rem]:grid-cols-2">
            <AdminInput
              label={t("unitPrice")}
              name="quoteUnitPrice"
              value={price}
              onChange={(value) => {
                setPrice(value);
                setPriceError(undefined);
                setMessage(null);
              }}
              inputMode="decimal"
              maxLength={10}
              prefix="$"
              error={priceError}
              required
            />
            <div className="flex min-w-0 flex-col gap-2 min-[90rem]:items-end">
              <span className={ADMIN_MUTED}>{t("total")}</span>
              <output
                aria-label={t("total")}
                className="type-catalog-page-title-56 text-stone-catalog-ink break-all"
              >
                {validPrice ? money(cents * request.quantity) : "—"}
              </output>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 min-[90rem]:justify-end">
            <button type="submit" className={ADMIN_BUTTON_SECONDARY}>
              {pending ? t("saving") : t("saveDraft")}
            </button>
            <button
              type="button"
              disabled
              title={t("deliveryUnavailable")}
              className={ADMIN_BUTTON_PRIMARY}
            >
              {t("send")}
            </button>
          </div>
        </fieldset>
      </form>
      <form
        aria-label={t("statusForm")}
        onSubmit={(event) => {
          event.preventDefault();
          perform(
            () =>
              setStoneRequestStatus({
                id: request.id,
                revision: snapshot.revision,
                status,
              }),
            t("statusSaved"),
          );
        }}
        className="border-stone-catalog-line flex flex-col gap-3 border-t pt-5"
      >
        <fieldset disabled={pending} className="flex items-end gap-4">
          <AdminSelect
            label={t("status")}
            name="requestStatus"
            value={status}
            onChange={(value) => {
              setStatus(value as StoneRequestStatus);
              setMessage(null);
            }}
            options={STONE_REQUEST_STATUSES.map((value) => ({
              value,
              label: t(`statuses.${value}`),
            }))}
            className="min-w-0 flex-1"
          />
          <button type="submit" className={ADMIN_BUTTON_SECONDARY}>
            {t("saveStatus")}
          </button>
        </fieldset>
        <p className={ADMIN_MUTED}>{t("trackingHint")}</p>
      </form>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "type-catalog-meta text-stone-catalog-ink"
              : "type-catalog-meta text-[#9b3d33]"
          }
        >
          {message.text}
        </p>
      )}
      <p className={ADMIN_MUTED}>{t("deliveryUnavailable")}</p>
    </section>
  );
}
