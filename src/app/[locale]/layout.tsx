import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

// Worker size (Phase 4a review R1). Turbopack writes the shared server chunks once per route group
// (public pages, account pages, auth pages): Better Auth + drizzle + zod were then three copies of about
// 320 KiB gzip together. These side-effect imports put the modules every group needs into the graph of
// this common parent, so the groups share one copy. They run nothing at render time (both only declare
// functions). Do not remove them, and add a module here when a new route group pulls in a big server
// dependency; `pnpm cf:size` fails when Better Auth appears in more than one SSR chunk.
import "@/server/auth/guards";
import "@/server/account/queries";

import { fontVariables } from "@/app/fonts";
import { clientMessages } from "@/i18n/client-messages";
import { routing } from "@/i18n/routing";

// Unknown locales are rejected below via hasLocale → notFound(). `dynamicParams = false`
// is deliberately not used: on Workers (OpenNext) it turned /ru and /en into 404s
// (NoFallbackError) because the prerender lookup did not match.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Server components read every namespace through i18n/request.ts; the browser gets all but the internal ones.
  const messages = clientMessages(await getMessages({ locale }));

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
