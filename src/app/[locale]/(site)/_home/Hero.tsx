import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/icons/Icon";
import type { Locale } from "@/i18n/routing";

/*
 * Hero scene art direction: one flattened image per Figma layout (Hero/Scene 296:531), applied as a CSS
 * `background-image: image-set(...)` per media query. The style engine downloads only the rule that
 * matches, so exactly one hero image is requested (e2e "hero loads exactly one image" counts the
 * requests at 1440 and 390). A `<picture>` with `<source media>` was tried first: Chromium's preload
 * scanner in phone emulation requested the 1920 source as well, i.e. two downloads. `getImageProps`
 * builds each 1x / 2x pair through the project's custom loader (manifest keys only).
 * Source size / displayed box: 1920 -> 1920x630, 1440 -> 1440x630, 1024 -> 1024x470 (full-bleed
 * behind the header), 768 -> 704x330 and 390 / 360 -> 358x168 / 328x154 (inset, headline below).
 * The scene is decorative (the headline is live text), so it is a presentational element.
 */
const SCENES = [
  { media: null, key: "360", width: 328, height: 154 },
  { media: "(min-width: 390px)", key: "390", width: 358, height: 168 },
  { media: "(min-width: 768px)", key: "768", width: 704, height: 330 },
  { media: "(min-width: 1024px)", key: "1024", width: 1024, height: 470 },
  { media: "(min-width: 1440px)", key: "1440", width: 1440, height: 630 },
  { media: "(min-width: 1920px)", key: "1920", width: 1920, height: 630 },
] as const;

/*
 * LCP: from 1024 px the scene is the largest paint. A CSS background is only discovered after the
 * stylesheet, so each wide layout gets a `<link rel="preload" as="image" imagesrcset media>` whose media
 * query is exclusive of the others (a phone or tablet preloads nothing, and the 1x / 2x candidate the
 * browser picks is the same one `image-set()` picks): still exactly one hero request. The >= 1920
 * scene has no preload: Chromium's phone emulation evaluates `min-width: 1920px` link media as true
 * at parse time and would request that image next to the real one (a second hero download).
 */
const PRELOAD_MEDIA: Record<string, string> = {
  "1024": "(min-width: 1024px) and (max-width: 1439.98px)",
  "1440": "(min-width: 1440px) and (max-width: 1919.98px)",
};

/** "a.webp 1x, b.webp 2x" (next/image srcset) -> image-set(url("a.webp") 1x, url("b.webp") 2x) */
function imageSet(srcSet = "") {
  const entries = srcSet
    .split(", ")
    .map((entry) => {
      const [url, density] = entry.split(" ");
      return `url("${url}") ${density}`;
    })
    .join(", ");
  return `image-set(${entries})`;
}

function HeroScene() {
  const rules = SCENES.map((scene) => {
    const { srcSet } = getImageProps({
      src: `images/hero/scene-${scene.key}`,
      alt: "",
      width: scene.width,
      height: scene.height,
    }).props;
    const media = PRELOAD_MEDIA[scene.key];
    if (media && srcSet) {
      preload(srcSet.split(" ")[0], {
        as: "image",
        imageSrcSet: srcSet,
        fetchPriority: "high",
        media,
      });
    }
    const rule = `.hero-scene{background-image:${imageSet(srcSet)}}`;
    return scene.media === null ? rule : `@media ${scene.media}{${rule}}`;
  }).join("");

  return (
    <>
      <style>{rules}</style>
      <div
        aria-hidden="true"
        className="hero-scene size-full bg-cover bg-center bg-no-repeat"
      />
    </>
  );
}

/*
 * Home v2 hero (Section / Hero 722:1304 at 1440, 722:1567 at 1024, 724:1673 at 768, 716:1084 at 390),
 * built as Figma draws it, including its quirks:
 *  - >= 768 the header is drawn over the page top: the page root is pulled up by the 72 px header, so
 *    the hero starts at y = 0 and the sticky header covers its top (at 768 that is the top 56 px of
 *    the scene, which starts at y = 16).
 *  - >= 1024 the scene is full-bleed, 630 high at 1440 and 470 at 1024; the intro panel sits on it:
 *    headline in four lines (text/ink, Hero/Headline, tracking 0.14em) and the Search pill under it.
 *    Left / top offset 131 / 122 at 1440, 43 / 87 at 1024; gap 16 / 12.
 *  - < 1024 the scene is inset by the layout margin with the 358:168 ratio, then the one-line
 *    headline (text/primary) and the Search pill right-aligned. The intro panel (768) and the hero
 *    (390) are fixed 46 px high in Figma, so their content overflows: at 768 the pill fills the
 *    section's bottom padding, at 390 the whole hero is 46 px high and the Main panels start right
 *    under the scene's top, covering the headline and the pill (the Main wrapper paints above).
 * Search is Figma's Search/Pill Graphite (21:108): the closed pill 168x46, and the Open variant
 * (971:28937) = the pill (fill rgba(88,92,96,.2) to rgba(74,77,81,.2)) with the 168x52 "Search panel"
 * 8 px below it, which holds the input. A native <details> toggles it (no JavaScript); the form
 * submits to /catalog?q=...
 * At 390 the form is `invisible` (visibility: hidden): the pill is covered by the first panel, so it
 * must not stay in the tab order or the accessibility tree (WCAG 2.4.11 Focus Not Obscured). The h1
 * stays: it is text, not a control.
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = useTranslations("pages.home.hero");
  const field = useTranslations("components.search");

  return (
    <section className="relative flex flex-col items-end gap-4 px-(--layout-margin) pt-4 pb-6 max-md:h-[46px] md:gap-5 lg:h-[470px] lg:items-start lg:p-0 min-[90rem]:h-[630px]">
      <div className="relative aspect-[358/168] w-full shrink-0 overflow-clip lg:absolute lg:inset-0 lg:aspect-auto">
        <HeroScene />
      </div>
      <div className="flex w-full shrink-0 flex-col items-end gap-4 md:max-lg:h-[46px] lg:relative lg:mx-auto lg:max-w-[1440px] lg:items-start lg:gap-3 lg:pt-[87px] lg:pr-6 lg:pl-[43px] min-[90rem]:gap-4 min-[90rem]:pt-[122px] min-[90rem]:pl-[131px]">
        <h1 className="type-hero-headline text-primary lg:text-ink w-full uppercase">
          <span className="lg:block">{t("line1")}</span>{" "}
          <span className="lg:block">{t("line2")}</span>{" "}
          <span className="lg:block">{t("line3")}</span>{" "}
          <span className="lg:block">{t("line4")}</span>
        </h1>
        <form
          role="search"
          action={`/${locale}/catalog`}
          method="get"
          className="relative has-[details[open]]:z-20 max-md:invisible"
        >
          <details className="group">
            <summary className="focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus hov:border-glass-strong motion-hover flex h-[46px] w-[168px] cursor-pointer list-none items-center justify-center gap-4 rounded-full border border-[rgba(255,255,255,0.1)] bg-linear-to-b from-[rgba(76,80,83,0.2)] to-[rgba(65,68,72,0.2)] text-[16px] leading-5 font-medium text-white outline-0 drop-shadow-[0_8px_10px_rgba(20,23,26,0.35)] select-none group-open:from-[rgba(88,92,96,0.2)]! group-open:to-[rgba(74,77,81,0.2)]! md:from-[#4c5053] md:to-[#414448] [&::-webkit-details-marker]:hidden">
              <Icon name="search" className="size-5!" />
              <span>{t("searchPlaceholder")}</span>
            </summary>
            <input
              type="search"
              name="q"
              aria-label={t("searchLabel")}
              placeholder={field("placeholder")}
              className="type-catalog-field-value text-stone-catalog-ink placeholder:text-stone-catalog-secondary border-stone-catalog-line bg-stone-catalog-card focusv:border-ink-primary focusv:outline-1 focusv:-outline-offset-1 focusv:outline-ink-primary absolute top-full left-0 mt-2 block h-[52px] w-[168px] appearance-none rounded-[12px] border px-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] outline-0 [&::-webkit-search-cancel-button]:hidden"
            />
          </details>
        </form>
      </div>
    </section>
  );
}
