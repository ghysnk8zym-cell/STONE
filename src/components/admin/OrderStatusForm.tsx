"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";
import type { OrderStatus } from "@/features/admin/results";
import { setOrderStatus } from "@/server/admin/actions";

import { AdminSelect } from "./fields";
import { ADMIN_BUTTON_PRIMARY } from "./parts";

/**
 * Fulfillment select and "Update fulfillment" of the Order detail card (Figma Orders 1440 1077:52374). Saves through
 * the guarded `setOrderStatus` action, then re-renders the page; the Client sees the new status in their Orders.
 * Keyed by the order number and its stored status by the page, so it starts from the right value on every order.
 */
export function OrderStatusForm({
  number,
  status,
}: {
  number: string;
  status: OrderStatus;
}) {
  const t = useTranslations("admin.orders");
  const router = useRouter();
  const [value, setValue] = useState<OrderStatus>(status);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await setOrderStatus(number, value);
        if (!result.ok) {
          setMessage({ ok: false, text: t(`detail.errors.${result.code}`) });
          return;
        }
        setMessage({ ok: true, text: t("detail.saved") });
      } catch {
        // The action threw (database timeout, 5xx): show the message instead of the error boundary; the chosen status stays.
        setMessage({ ok: false, text: t("detail.errors.generic") });
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-5"
    >
      <AdminSelect
        label={t("detail.fulfillment")}
        name="status"
        value={value}
        onChange={(next) => setValue(next as OrderStatus)}
        options={[
          { value: "in_progress", label: t("status.in_progress") },
          { value: "delivered", label: t("status.delivered") },
        ]}
      />
      <button
        type="submit"
        disabled={pending}
        className={`${ADMIN_BUTTON_PRIMARY} w-fit min-[90rem]:w-full`}
      >
        {t("detail.update")}
      </button>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "type-footer-small text-success-ink"
              : "type-footer-small text-[#9b3d33]"
          }
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
