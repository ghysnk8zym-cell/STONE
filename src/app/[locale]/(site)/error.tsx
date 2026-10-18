"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";

/*
 * The public site's error boundary (final review I1): a failure while a page renders (a database timeout, a 5xx)
 * ends here, inside the site shell, in the visitor's language, instead of Next's raw "Application error". Not in
 * Figma, so it reuses the 404 page's look (catalog surface, tokens only). The error itself is never shown.
 */
export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("pages.error");
  return (
    <section className="bg-stone-catalog-page text-stone-catalog-ink flex flex-1 flex-col items-start justify-center gap-6 px-(--layout-margin) py-16">
      <h1 className="type-catalog-page-title">{t("title")}</h1>
      <p className="type-body-m text-stone-catalog-secondary max-w-prose">
        {t("body")}
      </p>
      <Button variant="primary" onClick={reset}>
        {t("retry")}
      </Button>
    </section>
  );
}
