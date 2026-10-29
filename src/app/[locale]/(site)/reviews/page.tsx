import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/buttons/Button";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reviews">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "pages.reviews" });
  return { title: t("title"), description: t("description") };
}

export default async function ReviewsPage({
  params,
}: PageProps<"/[locale]/reviews">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("pages.reviews");
  return (
    <section
      data-page-surface="catalog"
      className="bg-stone-catalog-page text-stone-catalog-ink flex flex-1 flex-col items-start gap-6 px-4 py-12 md:px-8"
    >
      <h1 className="type-catalog-page-title">{t("title")}</h1>
      <p className="type-body-m max-w-prose">{t("empty")}</p>
      <Button variant="graphite-solid" href="/catalog">
        {t("catalog")}
      </Button>
    </section>
  );
}
