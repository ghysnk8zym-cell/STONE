import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/features/auth/AuthForm";
import { AuthScreen, AuthTitle } from "@/features/auth/AuthScreen";
import { loadAuthPage, nextFromSearch } from "@/features/auth/page-state";
import type { Locale } from "@/i18n/routing";

import { signUpAction } from "../actions";

// Per-request: the page reads the session, `next` and whether a database is configured, none of which exist at
// build time (a prerendered copy would be served from the route cache to everyone).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-up">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "auth",
  });
  return { title: t("meta.signUp") };
}

/* Create account (Figma 431:3193 and breakpoints). Dynamic, like sign-in. */
export default async function SignUpPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "auth",
  });
  const state = await loadAuthPage(locale);

  return (
    <AuthScreen>
      <AuthTitle>{t("signUp.title")}</AuthTitle>
      {state === "unavailable" ? (
        <p
          role="status"
          className="type-catalog-field-value text-ink-on-dark/88 text-[16px] lg:text-[18px]"
        >
          {t("errors.unavailable")}
        </p>
      ) : (
        <AuthForm
          mode="sign-up"
          locale={locale}
          next={nextFromSearch((await searchParams).next, locale)}
          action={signUpAction}
        />
      )}
    </AuthScreen>
  );
}
