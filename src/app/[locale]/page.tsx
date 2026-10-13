import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import type { Locale } from "@/i18n/routing";

// Placeholder until the Figma home page lands in Phase 3.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("placeholder");

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("body")}</p>
    </main>
  );
}
