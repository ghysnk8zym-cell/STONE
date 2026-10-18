"use client";

import { useTranslations } from "next-intl";

import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
} from "@/components/admin/parts";

/*
 * The admin area's error boundary (final review I1): a failure while an admin screen renders ends here, inside the
 * admin shell (sidebar kept), in the URL's language, with a retry. The error itself is never shown.
 */
export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("pages.error");
  return (
    <section
      aria-labelledby="admin-error-title"
      className={`${ADMIN_CARD} flex flex-col items-start gap-3`}
    >
      <h1 id="admin-error-title" className={ADMIN_CARD_TITLE}>
        {t("title")}
      </h1>
      <p className="type-catalog-field-value text-stone-catalog-secondary">
        {t("body")}
      </p>
      <button type="button" onClick={reset} className={ADMIN_BUTTON_PRIMARY}>
        {t("retry")}
      </button>
    </section>
  );
}
