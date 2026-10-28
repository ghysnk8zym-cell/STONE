"use client";

import Image from "next/image";
import { ViewTransition, useState } from "react";
import { productTransitionName } from "@/components/navigation/PageTransition";

import { parseProductMedia } from "@/lib/product-media";
import { cn } from "@/components/cn";

export type GalleryView = { id: "full" | "detail"; label: string };

/** Horizontal crop of the "detail" view in percent of the frame width (Figma Thumb 2). */
export type GalleryCrop = { left: number; size: number };

type GalleryProps = {
  slug?: string;
  /** Ordered real photos for products created through the upload editor. */
  photos?: string[];
  /** Manifest key of the one source image (e.g. `images/catalog/black-marble`). */
  image: string;
  alt: string;
  /** How the full view fits its frame (Figma: object-contain for studio slabs, object-cover otherwise). */
  fit: "cover" | "contain";
  /** Source pixel size, used to keep the crop undistorted in frames of any ratio. */
  aspect: readonly [number, number];
  crop: GalleryCrop;
  /** One entry hides the thumbnails; two give the Figma pair (full, close-up). */
  views: GalleryView[];
  /** Accessible name of the thumbnail group. */
  label: string;
};

/** Frame width at each layout: 726 px from 1440, then viewport minus (80 + 32 + 400) at 1024-1439, minus 64 from 768, minus 32 on phones. */
function frameSizes(scale: number): string {
  const px = (n: number) => `${Math.round(n * scale)}px`;
  return [
    `(min-width: 1440px) ${px(726)}`,
    `(min-width: 1024px) calc((100vw - 512px) * ${scale})`,
    `(min-width: 768px) calc((100vw - 64px) * ${scale})`,
    `calc((100vw - 32px) * ${scale})`,
  ].join(", ");
}

// the close-up image is `crop.size` % of the frame wide
const MAIN_SIZES: Record<GalleryView["id"], (crop: GalleryCrop) => string> = {
  full: () => frameSizes(1),
  detail: (crop) => frameSizes(crop.size / 100),
};
const THUMB_SIZES: Record<GalleryView["id"], (crop: GalleryCrop) => string> = {
  full: () => "200px",
  detail: (crop) => `${Math.round((200 * crop.size) / 100)}px`,
};

/*
 * Product gallery (Figma Gallery 782:11532): Main image radius 20 on stone/catalog-photo with the aspect
 * 726/572, then a 16 px gap and the Thumbnails row (200 x 132, radius 12, gap 16; at 390 two flexible
 * 96 px-high thumbs). The selected thumb carries a 2 px text/ink ring.
 *
 * There is one source image per product. Thumb 1 is the full image; Thumb 2 is the same image cropped
 * to its central part (Figma crop, per image fit: contain-fit slabs 294.12 % wide at left -105.88 %,
 * cover-fit photos 200 % at -50 %). The crop keeps the source aspect (width from `crop.size`, vertically
 * centred) so the main frame, whose ratio differs from the 200 x 132 thumb, shows it undistorted.
 */
function Frame({
  view,
  props,
  sizes,
  eager,
}: {
  view: GalleryView["id"];
  props: GalleryProps;
  sizes: string;
  eager?: boolean;
}) {
  const { image, alt, fit, aspect, crop } = props;
  if (view === "full") {
    return (
      <Image
        src={image}
        alt={alt}
        fill
        sizes={sizes}
        loading={eager ? "eager" : undefined}
        fetchPriority={eager ? "high" : undefined}
        className={fit === "contain" ? "object-contain" : "object-cover"}
      />
    );
  }
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left: `${crop.left}%`, width: `${crop.size}%` }}
    >
      <Image
        src={image}
        alt={alt}
        width={aspect[0]}
        height={aspect[1]}
        sizes={sizes}
        className="block h-auto w-full max-w-none"
      />
    </div>
  );
}

const THUMB =
  "relative block h-24 min-w-0 flex-1 cursor-pointer overflow-clip rounded-xl bg-stone-catalog-photo outline-0 motion-hover md:h-[132px] md:w-[200px] md:flex-none focusv:outline-2 focusv:outline-offset-2 focusv:outline-ink-primary";

export function Gallery(props: GalleryProps) {
  const { views, label } = props;
  const [view, setView] = useState<GalleryView["id"]>("full");
  const [selected, setSelected] = useState(0);
  if (
    props.photos?.length &&
    (props.photos.length > 1 || parseProductMedia(props.photos[0]))
  ) {
    const photos = props.photos;
    const active = Math.min(selected, photos.length - 1);
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <ViewTransition
          name={props.slug ? productTransitionName(props.slug) : undefined}
          default="none"
          share={active === 0 ? "stone-product" : "none"}
        >
          <div
            data-gallery-main
            data-view={active}
            className="bg-stone-catalog-photo relative aspect-[726/572] w-full overflow-clip rounded-[20px]"
          >
            <Image
              src={photos[active]}
              alt={props.alt}
              fill
              sizes={frameSizes(1)}
              className="object-contain"
              loading="eager"
            />
          </div>
        </ViewTransition>
        {photos.length > 1 && (
          <div
            role="group"
            aria-label={label}
            className="flex gap-4 overflow-x-auto p-1"
          >
            {photos.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={`${label} ${index + 1}`}
                aria-pressed={active === index}
                onClick={() => setSelected(index)}
                className={cn(THUMB, "min-w-24 shrink-0")}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-contain"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "border-ink pointer-events-none absolute inset-0 rounded-xl border-2",
                    active === index ? "block" : "hidden",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ViewTransition
        name={props.slug ? productTransitionName(props.slug) : undefined}
        default="none"
        share={view === "full" ? "stone-product" : "none"}
      >
        <div
          data-gallery-main
          data-view={view}
          className="bg-stone-catalog-photo relative aspect-[726/572] w-full overflow-clip rounded-[20px]"
        >
          <Frame
            view={view}
            props={props}
            sizes={MAIN_SIZES[view](props.crop)}
            eager
          />
        </div>
      </ViewTransition>
      {views.length > 1 ? (
        <div role="group" aria-label={label} className="flex gap-4">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              aria-label={v.label}
              onClick={() => setView(v.id)}
              className={THUMB}
            >
              <Frame
                view={v.id}
                props={{ ...props, alt: "" }}
                sizes={THUMB_SIZES[v.id](props.crop)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "border-ink pointer-events-none absolute inset-0 rounded-xl border-2",
                  view === v.id ? "block" : "hidden",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
