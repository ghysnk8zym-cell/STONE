"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { CustomerRole } from "@/features/admin/results";
import { useRouter } from "@/i18n/navigation";
import { setCustomerRole } from "@/server/admin/customer-actions";

import { AdminSelect } from "./fields";
import { ADMIN_BUTTON_PRIMARY } from "./parts";

/** Keyed by customer ID. A saved role follows fresh server props without discarding feedback. */
export function CustomerRoleForm({
  id,
  role,
}: {
  id: string;
  role: CustomerRole;
}) {
  const t = useTranslations("admin.customers");
  const router = useRouter();
  const [draft, setDraft] = useState<CustomerRole | null>(null);
  const value = draft ?? role;
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          try {
            const result = await setCustomerRole(id, value);
            if (!result.ok) {
              setMessage({ ok: false, text: t(`errors.${result.code}`) });
              return;
            }
            setDraft(null);
            setMessage({ ok: true, text: t("saved") });
          } catch {
            setMessage({ ok: false, text: t("errors.generic") });
            return;
          }
          router.refresh();
        });
      }}
      className="flex flex-col gap-3"
    >
      <fieldset
        disabled={pending}
        className="flex min-w-0 flex-wrap items-end gap-4"
      >
        <AdminSelect
          label={t("role")}
          name="role"
          value={value}
          onChange={(next) => {
            setDraft(next as CustomerRole);
            setMessage(null);
          }}
          className="min-w-[180px] flex-1"
          options={[
            { value: "client", label: t("roles.client") },
            { value: "admin", label: t("roles.admin") },
          ]}
        />
        <button
          type="submit"
          disabled={pending || value === role}
          className={ADMIN_BUTTON_PRIMARY}
        >
          {t("updateRole")}
        </button>
      </fieldset>
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
