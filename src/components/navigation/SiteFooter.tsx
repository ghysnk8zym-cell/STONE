import { useTranslations } from "next-intl";
import { type ReactNode, useId } from "react";

import { Link } from "@/i18n/navigation";

import { SocialButton, type SocialButtonProps } from "../buttons/SocialButton";
import { cn } from "../cn";

type FooterLinkKey = "information" | "about" | "reviews";
type SocialNetwork = SocialButtonProps["label"];

export type SiteFooterProps = {
  /**
   * Destination of each footer link. Figma defines none (the Information, About us, Reviews and
   * Privacy policy pages are not in the file; About is a documented gap), so no route is invented:
   * an entry that is not supplied renders as a disabled, non-link item. Slugs are locale-free
   * (ADR-004), the next-intl `Link` adds the locale prefix.
   */
  links?: Partial<Record<FooterLinkKey, string>>;
  privacyHref?: string;
  /**
   * Profile URLs of the four social buttons. Figma only draws the monogram placeholders; a network
   * without a URL renders its SocialButton disabled (non-link) instead of a dead "#" link.
   */
  social?: Partial<Record<SocialNetwork, string>>;
  /**
   * Pages with the floating phone TabBar: the footer keeps 100 px under its content (after its 24 px padding) on phones
   * (`pb-footer-tabbar`: its own 24 px + the 100 px the bar covers) so the bar floats over the footer's own glass, as in Figma, instead of over a
   * page-background band below it.
   */
  reserveTabBar?: boolean;
};

const LINKS = [
  "information",
  "about",
  "reviews",
] as const satisfies readonly FooterLinkKey[];
const NETWORKS = [
  "TG",
  "VK",
  "IG",
  "WA",
] as const satisfies readonly SocialNetwork[];

/*
 * Figma Footer 22:104 (Layout=Desktop 22:53, Layout=Mobile 22:80) and the screen instances Home v2
 * 722:1354 (1440) and 716:1253 (390). Component description: Desktop >= 1024 = links . logo .
 * follow us in three columns, vertically centred, plus the legal row; Mobile <= 768 = stacked and
 * centred. One DOM, switched at 1024 (`lg`) with responsive classes; the DOM follows the desktop
 * reading order (links, wordmark, follow us) and the wordmark is moved to the top on mobile with
 * `order`.
 *
 * Bound variables (get_variable_defs on both instances): surface/footer fill + effect style "Blur/
 * Glass background 24", border/glass (top border, divider), layout/header-pad-x (side padding),
 * layout/footer-link-gap, type/footer-size (Footer/Link), type/logo-size (Brand/Logo), text/primary,
 * text/secondary (legal), Footer/Small (legal). Raw in Figma: paddings 28/24 (desktop) and 32/24
 * (mobile), gaps 20 / 24, the 50 px wordmark rules, gap 12 and 16.
 *
 * Wordmark: the footer draws its own lockup (two 50 px text/primary rules around the Brand/Logo
 * text), different from the 24 px single-rule header Logo, so the header Logo is not reused. It is
 * not a link in Figma and is plain text here.
 * Touch targets: every link has a >= 44 px (mobile) / 24 px (desktop) hit area: link rows use
 * py-3 (the 44 px social buttons set the row height on desktop, so the layout does not change)
 * and the privacy link uses py-[14px] (mobile) / py-1 with a negative margin (desktop).
 * Figma draws no link states: hover underlines the Lusitana links and lightens the legal link,
 * focus is a 2 px accent-focus outline, matching the header.
 */
const FOCUS =
  "rounded-sm outline-0 focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus";
const INERT = "cursor-default";

const NAV_LINK = cn(
  "block py-3 text-primary type-footer-link whitespace-nowrap uppercase motion-hover",
  "hov:underline hov:underline-offset-4",
  FOCUS,
);
const LEGAL_LINK = cn(
  "block py-[14px] text-secondary type-footer-small whitespace-nowrap motion-hover lg:-my-1 lg:py-1",
  "hov:text-primary",
  FOCUS,
);

/** A link, or an inert `role="link" aria-disabled` item when the destination is unknown. */
function FooterLink({
  href,
  className,
  children,
}: {
  href?: string;
  className: string;
  children: ReactNode;
}) {
  if (href === undefined) {
    return (
      <span role="link" aria-disabled="true" className={cn(className, INERT)}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function SiteFooter({
  links = {},
  privacyHref,
  social = {},
  reserveTabBar = false,
}: SiteFooterProps) {
  const t = useTranslations("components.footer");
  const name = useTranslations("common")("siteName");
  const followId = useId();

  return (
    <footer
      className={cn(
        "glass-blur border-glass bg-surface-footer flex flex-col items-center gap-6 border-t px-(--layout-header-pad-x) pt-8 lg:items-start lg:gap-5 lg:pt-7",
        reserveTabBar ? "max-md:pb-footer-tabbar md:pb-6" : "pb-6",
      )}
    >
      <div className="flex w-full flex-col items-center gap-6 lg:flex-row">
        <nav aria-label={t("label")} className="lg:flex-1">
          <ul className="flex flex-wrap justify-center gap-x-(--layout-footer-link-gap) lg:flex-nowrap lg:justify-start">
            {LINKS.map((key) => (
              <li key={key}>
                <FooterLink href={links[key]} className={NAV_LINK}>
                  {t(key)}
                </FooterLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="order-first flex shrink-0 items-center gap-3 lg:order-none">
          <span aria-hidden="true" className="bg-primary h-px w-[50px]" />
          <span className="text-primary type-brand-logo whitespace-nowrap">
            {name}
          </span>
          <span aria-hidden="true" className="bg-primary h-px w-[50px]" />
        </div>
        <div className="flex flex-col items-center gap-4 lg:flex-1 lg:flex-row lg:justify-end">
          <p
            id={followId}
            className="text-primary type-footer-link whitespace-nowrap uppercase"
          >
            {t("followUs")}
          </p>
          <ul aria-labelledby={followId} className="flex gap-2">
            {NETWORKS.map((network) => {
              const href = social[network];
              return (
                <li key={network}>
                  <SocialButton
                    label={network}
                    href={href ?? ""}
                    inert={href === undefined}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" className="bg-glass h-px w-full" />
      <div className="flex w-full flex-col items-center lg:flex-row lg:justify-between">
        <p className="text-secondary type-footer-small">{t("copyright")}</p>
        <FooterLink href={privacyHref} className={LEGAL_LINK}>
          {t("privacy")}
        </FooterLink>
      </div>
    </footer>
  );
}
