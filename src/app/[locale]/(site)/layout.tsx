import { setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { PHASE3_INERT } from "@/components/navigation/nav-items";
import { ShellTabBar } from "@/components/navigation/ShellTabBar";
import type { Locale } from "@/i18n/routing";

/*
 * Site shell: header, `<main>`, footer and the phone tab bar around every public page.
 * - `(site)` is a route group, so the URL is unchanged. `/_styleguide` sits outside it on purpose:
 *   it draws its own header, footer and tab bar stages and must stay free of the shell
 *   (`pnpm qa:visual` captures).
 * - The layout owns the single `<main>` landmark. Pages render their content only, never `<main>`.
 *   The localised 404 (`not-found.tsx` here) renders inside it, so unknown paths keep the shell.
 * - `max-md:pb-tabbar` reserves 100 px under the footer on phones for the fixed tab bar
 *   (docs/ARCHITECTURE.md, Layout notes for Phase 3).
 * - Header, mobile menu and tab bar get `PHASE3_INERT`: Cart, account, Create Your Stone and
 *   Favorites have no pages yet and render as non-links.
 */
export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <div data-site-shell className="max-md:pb-tabbar flex min-h-dvh flex-col">
      <SiteHeader inert={PHASE3_INERT.nav} />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
      <ShellTabBar />
    </div>
  );
}
