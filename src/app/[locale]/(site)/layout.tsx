import { setRequestLocale } from "next-intl/server";

import { AccountStateProvider } from "@/features/account/AccountStateProvider";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { INERT } from "@/components/navigation/nav-items";
import { ShellTabBar } from "@/components/navigation/ShellTabBar";
import type { Locale } from "@/i18n/routing";

/*
 * Site shell: header, `<main>`, footer and the phone tab bar around every public page.
 * - `(site)` is a route group, so the URL is unchanged. `/_styleguide` sits outside it on purpose:
 *   it draws its own header, footer and tab bar stages and must stay free of the shell
 *   (`pnpm qa:visual` captures).
 * - The shell background is the dark page surface, unless the page root (a direct child of <main>) declares `data-page-surface="catalog"`
 *   (constants in ./page-surface.ts; the class below must repeat the literal, Tailwind reads it statically):
 *   the translucent glass header and footer blur whatever is behind them, so on the light catalog pages
 *   (Figma: header ~#666, footer ~#3b3c3e) the light surface must sit behind them too, not only behind <main>.
 * - The layout owns the single `<main>` landmark. Pages render their content only, never `<main>`.
 *   The localised 404 (`not-found.tsx` here) renders inside it, so unknown paths keep the shell.
 * - The footer reserves 100 px under its content on phones (`reserveTabBar` -> `max-md:pb-footer-tabbar`)
 *   for the fixed tab bar, so the footer glass extends under the floating bar like in Figma
 *   (docs/ARCHITECTURE.md, Layout notes for Phase 3).
 * - Header, mobile menu and tab bar get `INERT`: Cart and Create Your Stone have no pages yet and render as
 *   non-links. Favorites and the account entries are live (Phase 4a).
 * - `AccountStateProvider` gives the header, the tab bar and the hearts the visitor state from `GET /api/me`,
 *   a client island: the layout reads no cookies, so the public pages stay static where they can be (home is SSG; the catalog and product pages render per request).
 */
export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <AccountStateProvider>
      <div
        data-site-shell
        className="bg-surface-page has-[>main>[data-page-surface=catalog]]:bg-stone-catalog-page flex min-h-dvh flex-col"
      >
        <SiteHeader inert={INERT.nav} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter reserveTabBar />
        <ShellTabBar />
      </div>
    </AccountStateProvider>
  );
}
