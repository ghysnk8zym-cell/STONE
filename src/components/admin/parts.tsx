import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon, type IconName } from "../icons/Icon";

/*
 * Small parts of the admin screens (Figma Admin Overview 1440 1077:51932, Orders 1077:52201, Products
 * 1077:52506, Add product 1077:52622; components Admin/Button 1060:648, Admin/Field 1060:649, Admin/Status
 * chip 1060:681). Colours are the stone/catalog tokens; the three Figma colours that have no token
 * (taupe #dcd2c3, focus brown #8a735a, bar #514e48) are plain values, as the Figma variables snapshot has none.
 * Server-compatible: no state.
 */

/** The light card of the admin screens: stone/catalog-card, 1 px stone/catalog-line, r20. */
export const ADMIN_CARD =
  "rounded-[20px] border border-stone-catalog-line bg-stone-catalog-card px-4 py-5 min-[90rem]:px-7 min-[90rem]:py-6";

/** "Catalog/Product name" 26/32: the title of a card. */
export const ADMIN_CARD_TITLE =
  "[font-family:var(--font-display)] text-[26px] leading-8 font-normal text-stone-catalog-ink";

/** Muted 14/20 text on the light cards. */
export const ADMIN_MUTED = "type-catalog-meta text-stone-catalog-secondary";

const BUTTON_BASE =
  "motion-hover focusv:outline-2 focusv:outline-offset-2 focusv:outline-ink-primary inline-flex h-11 max-w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 type-button-label whitespace-nowrap outline-0 select-none disabled:cursor-default disabled:opacity-45 aria-disabled:cursor-default aria-disabled:opacity-45";

/** Admin/Button Primary: ink pill with Milk text. */
export const ADMIN_BUTTON_PRIMARY = cn(
  BUTTON_BASE,
  "bg-stone-catalog-ink text-stone-catalog-card hov:bg-ink-primary",
);

/** Admin/Button Secondary: ink outline. */
export const ADMIN_BUTTON_SECONDARY = cn(
  BUTTON_BASE,
  "border border-stone-catalog-ink text-stone-catalog-ink hov:bg-overlay-tint-10",
);

export function AdminLinkButton({
  href,
  kind = "primary",
  icon,
  className,
  children,
}: {
  href: string;
  kind?: "primary" | "secondary";
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        kind === "primary" ? ADMIN_BUTTON_PRIMARY : ADMIN_BUTTON_SECONDARY,
        className,
      )}
    >
      {icon && <Icon name={icon} size={16} className="size-[18px]!" />}
      {children}
    </Link>
  );
}

/**
 * Head of an admin screen: the Lusitana title (44, 56 from 1440), a hairline, a 16/22 sub line, and the
 * page actions at the right. `lead` is the breadcrumb of the form pages.
 */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
  lead,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {lead}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-center gap-5">
          <h1 className="type-catalog-page-title-56 text-stone-catalog-ink wrap-anywhere">
            {title}
          </h1>
          <span
            aria-hidden="true"
            className="bg-stone-catalog-line h-8 w-px shrink-0 max-md:hidden"
          />
          <p className="type-catalog-field-value text-stone-catalog-secondary max-md:hidden">
            {subtitle}
          </p>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

/** Admin/Status chip 1060:681. */
export type ChipTone = "processing" | "fulfilled" | "published" | "draft";

const CHIP_TONES: Record<ChipTone, string> = {
  processing: "bg-accent-focus text-ink",
  fulfilled: "bg-success-bg text-success-ink",
  published: "bg-success-bg text-success-ink",
  draft: "bg-stone-catalog-photo text-stone-catalog-secondary",
};

export function StatusChip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "type-footer-small inline-flex items-center self-start rounded-full px-2.5 py-1 whitespace-nowrap",
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The footnote under every screen ("Demo records and values for design review."). */
export function AdminFootnote({ children }: { children: ReactNode }) {
  return (
    <p className="type-footer-small text-stone-catalog-secondary text-right">
      {children}
    </p>
  );
}
