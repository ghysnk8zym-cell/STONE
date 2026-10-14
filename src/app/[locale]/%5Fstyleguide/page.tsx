import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getServerEnv } from "@/server/env";

import { Approval } from "./sections/Approval";
import { Buttons } from "./sections/Buttons";
import { Cards } from "./sections/Cards";
import { Forms } from "./sections/Forms";
import { Navigation } from "./sections/Navigation";
import { Tokens } from "./sections/Tokens";

type StyleguideProps = { params: Promise<{ locale: string }> };

/* The folder is `%5Fstyleguide` because a plain leading underscore makes an App Router folder
   private; the encoded form routes to /ru/_styleguide and /en/_styleguide. */

export async function generateMetadata({
  params,
}: StyleguideProps): Promise<Metadata> {
  const { locale } = await params;
  // In production the page is a 404: do not put the styleguide title (or any styleguide copy) on it.
  await connection();
  const hidden = getServerEnv().APP_ENV === "production";
  const title =
    !hidden && hasLocale(routing.locales, locale)
      ? (await getTranslations({ locale, namespace: "styleguide" }))("title")
      : undefined;
  return { title, robots: { index: false, follow: false } };
}

const SECTIONS = [
  "tokens",
  "buttons",
  "forms",
  "cards",
  "navigation",
  "approval",
] as const;

/**
 * Internal component reference (Phase 2, spec section 5): every component in every state, plus the
 * owner-approval block. Never linked from the site, noindex, and a 404 in production.
 */
export default async function StyleguidePage({ params }: StyleguideProps) {
  // Opt out of prerendering: APP_ENV is read per request, so one build serves every environment.
  await connection();
  if (getServerEnv().APP_ENV === "production") notFound();

  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("styleguide");

  return (
    <main className="bg-surface-page text-primary min-h-dvh px-(--layout-margin) py-10">
      <div className="flex flex-col gap-16">
        <header className="flex flex-col gap-6">
          <h1 className="type-catalog-page-title text-primary">{t("title")}</h1>
          <p className="type-body-m text-secondary max-w-prose">{t("intro")}</p>
          <nav aria-label={t("toc")}>
            <ul className="flex flex-wrap gap-x-6">
              {SECTIONS.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="type-button-label text-primary focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus block rounded-sm py-3 underline underline-offset-4 outline-0"
                  >
                    {t(`sections.${id}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <Tokens />
        <Buttons />
        <Forms />
        <Cards />
        <Navigation />
        <Approval />
      </div>
    </main>
  );
}
