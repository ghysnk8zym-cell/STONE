import { setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

/*
 * Sign-in and sign-up: the dark photographic screens (Figma "Create account") have no site header,
 * footer or tab bar, so this route group does not use the (site) shell. The layout owns the single
 * <main> landmark. The URL is unchanged (`/{locale}/sign-in`, `/{locale}/sign-up`). The sign-out
 * confirmation does draw the header, so it lives in the (site) group.
 */
export default async function AuthLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <main className="flex min-h-dvh flex-col bg-[#2b2b2b]">{children}</main>
  );
}
