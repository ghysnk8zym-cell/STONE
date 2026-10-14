import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { IconButton } from "../buttons/IconButton";
import type { InteractionState } from "../buttons/Button";
import { cn } from "../cn";
import { DiscountBadge, PriceRow, type Price } from "./Price";

export type { Price } from "./Price";

export type ProductCardProps = {
  /** Product page. The whole card is the link. */
  href: string;
  name: string;
  /** "Marble · 600×300×20 mm" */
  meta: string;
  /** `src` is an `assets/figma-manifest.json` key without extension ("images/catalog/black-marble"). */
  image?: { src: string; alt: string };
  /**
   * Figma crops most photos (`cover`); the wide slab shots (Black Marble, Grey Limestone, Grey Marble)
   * are drawn `contain` on the stone/catalog-photo tile.
   */
  imageFit?: "cover" | "contain";
  price: Price;
  oldPrice?: Price;
  /** Whole percent, shown as "−15%". */
  discountPercent?: number;
  /** Heart state (aria-pressed). The toggle itself belongs to a client parent: pass `onFavoriteToggle`. */
  favorite?: boolean;
  onFavoriteToggle?: () => void;
  /** Favourites are not built yet: the heart keeps its Figma look but is a disabled, non-interactive control. */
  favoriteInert?: boolean;
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
};

/*
 * Figma: Catalog — 1440 (922:25494) > Card / Concrete Paver 922:25516 and Catalog — 390 (922:26324) >
 * 922:26346 (the master Card/Catalog product 337:556 is stale: a glass card without photo or price).
 *   1440: 302 px wide, p 12, gap 12, media 240 (r12), info p 0/4/4.
 *   390 : 173 px wide, p 8,  gap 10, media 190 (r12). Switches at 768 with the type style.
 * Fill stone/catalog-card, 1 px border stone/catalog-line, r20; media tile stone/catalog-photo; name in
 * Catalog/Product name (26/32, 18/24 on phones), meta in Catalog refined/Meta in stone/catalog-secondary.
 * Discount Badge 8 px from the media corner; heart bubble 2 px from the other corner (44 px target).
 *
 * Whole card = one link (Figma description). The link sits on the name and is stretched over the card
 * with ::after, so its accessible name is the product name and the heart (a sibling, z-10) is not nested
 * in it.
 *
 * States: Figma's live card draws none. The stale master has Hover / Pressed / Focus, whose effect
 * styles and 2 px ink/primary focus border are reused here (see the Task 7 report):
 *   hover   = shadow "Light/Glass card hover" + border stone/catalog-secondary (chosen)
 *   pressed = shadow "Light/Glass card pressed"
 *   focus   = 2 px ink/primary ring, only for keyboard focus on the link (inset: the card clips)
 */
const CARD = cn(
  "relative flex flex-col gap-[10px] overflow-clip rounded-[20px] border border-stone-catalog-line bg-stone-catalog-card p-2 text-left outline-0 md:gap-3 md:p-3 motion-hover",
  "hov:border-stone-catalog-secondary hov:shadow-(--effect-glass-card-hover-shadow)",
  "press:shadow-(--effect-glass-card-pressed-shadow)",
  "focusv:outline-2 focusv:-outline-offset-2 focusv:outline-ink-primary has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-ink-primary",
);

/*
 * `sizes` from the real media width: 1440 grid = 4 columns of 302 px minus 2 x 13 px (padding + border)
 * = 276 px; 390 grid = 2 columns of 173 px, i.e. about 45 vw. Between the two (not drawn in Figma) the
 * card is assumed to span about a third of the viewport.
 */
const SIZES = "(min-width: 1440px) 276px, (min-width: 768px) 30vw, 45vw";

/** Figma placeholder layer (Card/Catalog product 337:556 > Placeholder 337:519): slab silhouette + caption. */
function Placeholder() {
  const t = useTranslations("components.productCard");
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 p-2">
      <div
        aria-hidden="true"
        className="border-stone-catalog-line bg-stone-catalog-card aspect-[220/104] w-[52%] max-w-[220px] rounded-[4px] border"
      />
      <p className="type-catalog-meta text-stone-catalog-secondary text-center">
        {t("imageComingSoon")}
      </p>
    </div>
  );
}

/**
 * Catalog product card: photo, ♥, discount badge, name, meta, price and old price. Server-compatible:
 * the heart's `onClick` comes from a client parent; the card holds no state.
 */
export function ProductCard({
  href,
  name,
  meta,
  image,
  imageFit = "cover",
  price,
  oldPrice,
  discountPercent,
  favorite = false,
  onFavoriteToggle,
  favoriteInert = false,
  state,
}: ProductCardProps) {
  const t = useTranslations("components.productCard");
  return (
    <article data-state={state} className={CARD}>
      <div className="bg-stone-catalog-photo relative h-[190px] shrink-0 overflow-clip rounded-xl md:h-[240px]">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={SIZES}
            className={
              imageFit === "contain" ? "object-contain" : "object-cover"
            }
          />
        ) : (
          <Placeholder />
        )}
        {discountPercent !== undefined && (
          <DiscountBadge
            percent={discountPercent}
            className="absolute top-2 left-2"
          />
        )}
      </div>

      {/* Bubble 36 px: 8 px padding + 2 px + 4 px from the card edge (12 px padding on 768+). */}
      <div className="absolute top-3.5 right-3.5 z-10 md:top-[18px] md:right-[18px]">
        <IconButton
          icon="heart"
          tone="light"
          label={t("favorite", { name })}
          pressed={favorite}
          onClick={onFavoriteToggle}
          inert={favoriteInert}
        />
      </div>

      <div className="flex flex-col gap-0.5 px-1 pb-1 wrap-break-word">
        <h3 className="type-catalog-product-name text-stone-catalog-ink">
          <Link
            href={href}
            className="outline-0 after:absolute after:inset-0 after:content-['']"
          >
            {name}
          </Link>
        </h3>
        <p className="type-catalog-meta text-stone-catalog-secondary">{meta}</p>
        <PriceRow price={price} oldPrice={oldPrice} />
      </div>
    </article>
  );
}
