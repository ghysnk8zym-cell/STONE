import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";

/*
 * Small parts of the Account screens (Figma Account blocks 818:537 - 819:585, Account 1440 736:5318).
 * Server-compatible: no state. Colours are the stone/catalog tokens of the light cards; the dark
 * sidebar and banner use surface/footer.
 */

/** The light card of the Account screens: stone/catalog-card, 1 px stone/catalog-line, r20. */
export const CARD =
  "rounded-[20px] border border-stone-catalog-line bg-stone-catalog-card";

/** The dark glass panel (sidebar, selected-offers banner): surface/footer, border/glass, blur 12, r20. */
export const DARK_PANEL =
  "rounded-[20px] border border-glass bg-surface-footer backdrop-blur-[12px]";

/** "Catalog/Product name" 26/32, the title of the light cards. */
export const CARD_TITLE =
  "[font-family:var(--font-display)] text-[26px] leading-8 font-normal text-stone-catalog-ink";

/** Account/Avatar 818:537: initials in a 44 px circle; Stone on the dark sidebar, Milk on light cards. */
export function Avatar({
  initials,
  tone = "stone",
}: {
  initials: string;
  tone?: "stone" | "milk";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full [font-family:var(--font-display)] text-[18px] leading-6",
        tone === "stone"
          ? "border-glass bg-surface-selected text-primary border"
          : "bg-stone-catalog-photo text-stone-catalog-ink",
      )}
    >
      {initials}
    </span>
  );
}

/** Account/Status chip 818:548: In progress on stone/catalog-photo, Delivered on color/success-bg. */
export function StatusChip({
  status,
  className = "inline-flex",
}: {
  status: "in_progress" | "delivered";
  /** Carries the display (`inline-flex` by default), so a caller can hide it responsively. */
  className?: string;
}) {
  const t = useTranslations("account.orders.status");
  return (
    <span
      className={cn(
        "type-footer-small items-center rounded-full px-2.5 py-1 whitespace-nowrap",
        status === "delivered"
          ? "bg-success-bg text-success-ink"
          : "bg-stone-catalog-photo text-stone-catalog-secondary",
        className,
      )}
    >
      {t(status)}
    </span>
  );
}

/**
 * A product picture on a stone/catalog-photo tile, drawn uncropped for the studio slabs (`contain`) and
 * cropped for photographs, like the catalog card. The tile's size comes from `className`.
 */
export function ProductImage({
  image,
  fit,
  className,
  sizes,
}: {
  /** Asset manifest key without extension ("images/catalog/black-marble"). */
  image: string;
  fit: "cover" | "contain";
  className: string;
  sizes: string;
}) {
  return (
    <div
      className={cn(
        "bg-stone-catalog-photo relative overflow-clip rounded-xl",
        className,
      )}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes={sizes}
        className={fit === "contain" ? "object-contain" : "object-cover"}
      />
    </div>
  );
}

/** Account/Block header 818:549: Lusitana title and the "see all" text link with the arrow. */
export function BlockHeader({
  title,
  linkLabel,
  href,
}: {
  title: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <div className="flex h-10 items-center justify-between gap-4">
      <h2 className={CARD_TITLE}>{title}</h2>
      <Link
        href={href}
        className="type-button-label text-ink focusv:outline-2 focusv:outline-accent-focus flex shrink-0 items-center gap-1.5 rounded-lg py-2.5 outline-0"
      >
        {linkLabel}
        <Icon name="arrow" size={16} className="size-[18px]!" />
      </Link>
    </div>
  );
}

/** Title block of every Account screen: Catalog/Page title 44 and a 16/22 sub line. */
export function TitleBlock({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <h1 className="text-ink [font-family:var(--font-display)] text-[44px] leading-[52px] wrap-anywhere">
        {title}
      </h1>
      <p className="type-catalog-field-value text-ink-secondary wrap-anywhere">
        {subtitle}
      </p>
    </div>
  );
}

/** The empty state of a list: a light card with a title, a line of text and an optional action. */
export function EmptyCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        CARD,
        "flex flex-col items-start gap-3 p-(--layout-panel-pad)",
      )}
    >
      <h2 className={CARD_TITLE}>{title}</h2>
      <p className="type-catalog-field-value text-stone-catalog-secondary">
        {body}
      </p>
      {children}
    </div>
  );
}
