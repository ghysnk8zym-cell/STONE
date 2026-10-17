import { useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";

/*
 * Localised 404 content inside the site shell. Not in Figma: limited to what the Phase 3 spec states
 * (catalog page title, body copy, one action) on the catalog page surface, tokens only.
 * Rendered by `404/page.tsx` (the middleware rewrites unknown paths there, server-rendered) and by
 * `not-found.tsx` (fallback when `notFound()` is thrown, content via client rendering only).
 */
export function NotFoundView() {
  const t = useTranslations("pages.notFound");

  return (
    <section className="bg-stone-catalog-page text-stone-catalog-ink flex flex-1 flex-col items-start justify-center gap-6 px-(--layout-margin) py-16">
      <h1 className="type-catalog-page-title">{t("title")}</h1>
      <p className="type-body-m text-stone-catalog-secondary max-w-prose">
        {t("body")}
      </p>
      <Button variant="primary" href="/catalog">
        {t("toCatalog")}
      </Button>
    </section>
  );
}
