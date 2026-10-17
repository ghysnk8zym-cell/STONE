import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { NotFoundView } from "./NotFoundView";

/*
 * Boundary for `notFound()` inside the site shell. Unknown paths normally never get here: the
 * middleware route gate (src/lib/route-gate.ts) rewrites them to `404/page.tsx`, which is
 * server-rendered. A thrown `notFound()` only yields Next's empty error shell plus this content
 * via client rendering, so it stays as the fallback (paths the middleware matcher skips).
 *
 * Next resolves the metadata of every 404-status response (including `404/page.tsx`) from the
 * nearest not-found boundary, not from the page, so the localised title lives here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "meta.notFound",
  });
  return { title: t("title"), description: t("description") };
}

export default function SiteNotFound() {
  return <NotFoundView />;
}
