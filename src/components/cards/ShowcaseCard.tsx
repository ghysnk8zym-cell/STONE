import Image from "next/image";
import { useId } from "react";

import { Link } from "@/i18n/navigation";

import type { InteractionState } from "../buttons/Button";
import { cn } from "../cn";
import { IconButton } from "../buttons/IconButton";
import { DiscountBadge, PriceRow, type Price } from "./Price";

type Common = {
  /** Target of the whole card. Omitted: the card is inert (no link), e.g. the Home works cards. */
  href?: string;
  title: string;
  /** Material for product / promo ("Sandstone · 600×300×20 mm"), one-line description for work. */
  subtitle: string;
  /** `src` is an `assets/figma-manifest.json` key without extension ("images/showcase/work"). */
  image: {
    src: string;
    alt: string;
    /**
     * Work cards only: Figma draws the work photos as crops of one tall image (percentages of the
     * media box, `h-[333.33%] w-[171.72%] left-[-35.86%] top-[-66.67%]`). `className` positions the
     * `<Image>` absolutely inside the media (responsive variants allowed); `width` / `height` are the
     * intrinsic size.
     */
    crop?: { className: string; width: number; height: number };
  };
  /** `contain` for the wide slab shots Figma draws uncropped (Black Marble on the product card). */
  imageFit?: "cover" | "contain";
  /**
   * Fixed Figma layout: Desktop (353 px wide, 356 on Home v2 at 1440) or Mobile (148 / 240 / 280 px
   * carousel cards). Chosen by the page; the card itself is as wide as its parent. `responsive` is
   * Mobile below 768 px and Desktop from 768 px (Home v2 switches at the same breakpoint) in one DOM.
   */
  layout: "desktop" | "mobile" | "responsive";
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
  className?: string;
  /**
   * Product / promo only: accessible name of the Heart that Figma draws on the phone (Mobile) cards
   * (390 frames; none on Desktop). Rendered inert: favourites are not built yet (owner decision A).
   * Hidden from 768 px up.
   */
  favoriteLabel?: string;
};

export type ShowcaseCardProps = Common &
  (
    | {
        type: "product" | "work";
        price?: never;
        oldPrice?: never;
        discountPercent?: never;
      }
    | {
        type: "promo";
        price: Price;
        oldPrice?: Price;
        /** Whole percent, shown as "−20%". */
        discountPercent?: number;
      }
  );

/*
 * Figma: Card/Showcase 713:561, variants Type=Product / Promo / Work x Layout=Desktop / Mobile
 * (713:499, 713:509, 713:524, 713:530, 713:540, 713:555) and their Home v2 instances (722:1319,
 * 722:1335, 722:1349 at 1440; 716:1060 at 390), which are links. The component description is stale
 * (it still talks about scrims and surface/search badges): geometry and fills below are from the
 * variants themselves.
 *
 * Product / Promo = the light catalog card (stone/catalog-card, 1 px stone/catalog-line, r20, media tile
 * stone/catalog-photo r12): Desktop p 12, gap 12, media 220 / 240; Mobile p 8, gap 10, media 140 / 190.
 * Name 26/32 on Desktop, 18/24 on Mobile (Catalog/Product name, Catalog refined/Product name mobile).
 * Promo adds the discount Badge (8 px from the media corner) and the price row.
 *
 * Work = the dark glass card (surface/card fill, border/glass-strong, r20, 4 px rim) around a full-bleed
 * photo (r16, 300 / 240 high) with a frosted Panel at the bottom (surface/panel + blur, border/glass top
 * edge, p 20/16 Desktop, 14/12 Mobile): title in Card/Title, description in Body/M text/secondary.
 *
 * The card is one link (Figma description). The link is an empty overlay named by the title
 * (aria-labelledby), so the accessible name is the title only and nothing is nested in it.
 * States are not drawn for Card/Showcase; they follow the catalog card (see ProductCard) for the light
 * types and the glass-card hover fill for Work (documented in the Task 7 report).
 */
const LIGHT = cn(
  "relative flex flex-col overflow-clip rounded-[20px] border border-stone-catalog-line bg-stone-catalog-card text-left outline-0 motion-hover",
  "hov:border-stone-catalog-secondary hov:shadow-(--effect-glass-card-hover-shadow)",
  "press:shadow-(--effect-glass-card-pressed-shadow)",
  "focusv:outline-2 focusv:-outline-offset-2 focusv:outline-ink-primary has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink-primary",
);

const DARK = cn(
  "relative overflow-clip rounded-[20px] border border-glass-strong bg-surface-card p-1 text-left outline-0 motion-hover",
  "hov:bg-surface-card-hover",
  "press:bg-surface-selected",
  "focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent-focus",
);

/*
 * Per layout: card padding / gap and media height (Figma), the title style, and `sizes` = the media
 * width in the slot (card width minus padding and border): 356 px slot on Home v2 at 1440 -> 330 px
 * (light) / 346 px (work); 148 / 240 / 280 px carousel cards at 390 -> 130 / 222 / 270 px.
 */
const LIGHT_LAYOUT = {
  desktop: {
    card: "gap-3 p-3",
    title: "type-catalog-product-name-lg",
    media: { product: "h-[220px]", promo: "h-[240px]" },
    sizes: { product: "330px", promo: "330px" },
  },
  mobile: {
    card: "gap-[10px] p-2",
    title: "type-catalog-product-name-sm",
    media: { product: "h-[140px]", promo: "h-[190px]" },
    sizes: { product: "130px", promo: "222px" },
  },
  responsive: {
    card: "gap-[10px] p-2 md:gap-3 md:p-3",
    title: "type-catalog-product-name-sm md:type-catalog-product-name-lg",
    media: {
      product: "h-[140px] md:h-[220px]",
      promo: "h-[190px] md:h-[240px]",
    },
    sizes: {
      product: "(min-width: 768px) 330px, 130px",
      promo: "(min-width: 768px) 330px, 222px",
    },
  },
} as const;

const WORK_LAYOUT = {
  desktop: { media: "h-[300px]", panel: "px-5 py-4", sizes: "346px" },
  mobile: { media: "h-[240px]", panel: "px-3.5 py-3", sizes: "270px" },
  responsive: {
    media: "h-[240px] md:h-[300px]",
    panel: "px-3.5 py-3 md:px-5 md:py-4",
    sizes: "(min-width: 768px) 346px, 270px",
  },
} as const;

/** Product / promo / work card of the Home v2 sections. Server-compatible, no state. */
export function ShowcaseCard({
  type,
  layout,
  href,
  title,
  subtitle,
  image,
  imageFit = "cover",
  price,
  oldPrice,
  discountPercent,
  state,
  className,
  favoriteLabel,
}: ShowcaseCardProps) {
  const titleId = useId();
  const overlay =
    href === undefined ? null : (
      <Link
        href={href}
        aria-labelledby={titleId}
        className="absolute inset-0 z-10 outline-0"
      />
    );

  if (type === "work") {
    const work = WORK_LAYOUT[layout];
    return (
      <article data-state={state} className={cn(DARK, className)}>
        <div
          className={cn(
            "relative flex flex-col justify-end overflow-clip rounded-2xl",
            work.media,
          )}
        >
          {image.crop ? (
            <Image
              src={image.src}
              alt={image.alt}
              width={image.crop.width}
              height={image.crop.height}
              sizes={work.sizes}
              className={cn("absolute max-w-none", image.crop.className)}
            />
          ) : (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={work.sizes}
              className="object-cover"
            />
          )}
          <div
            className={cn(
              "border-glass bg-surface-panel relative flex flex-col gap-1 border-t wrap-break-word backdrop-blur-[12px]",
              work.panel,
            )}
          >
            <h3 id={titleId} className="type-card-title text-primary">
              {title}
            </h3>
            <p className="type-body-m text-secondary">{subtitle}</p>
          </div>
        </div>
        {overlay}
      </article>
    );
  }

  const light = LIGHT_LAYOUT[layout];
  return (
    <article data-state={state} className={cn(LIGHT, light.card, className)}>
      <div
        className={cn(
          "bg-stone-catalog-photo relative shrink-0 overflow-clip rounded-xl",
          light.media[type],
        )}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={light.sizes[type]}
          className={imageFit === "contain" ? "object-contain" : "object-cover"}
        />
        {type === "promo" && discountPercent !== undefined && (
          <DiscountBadge
            percent={discountPercent}
            className="absolute top-2 left-2"
          />
        )}
        {favoriteLabel !== undefined && layout !== "desktop" && (
          <span
            className={cn(
              "absolute top-1.5 right-1.5 z-20",
              layout === "responsive" && "md:hidden",
            )}
          >
            <IconButton icon="heart" tone="light" label={favoriteLabel} inert />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1 pb-1 wrap-break-word">
        <h3 id={titleId} className={cn(light.title, "text-stone-catalog-ink")}>
          {title}
        </h3>
        <p className="type-catalog-meta text-stone-catalog-secondary">
          {subtitle}
        </p>
        {type === "promo" && <PriceRow price={price} oldPrice={oldPrice} />}
      </div>
      {overlay}
    </article>
  );
}
