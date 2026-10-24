import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { useTranslations } from "next-intl";

import en from "../../../../../messages/en.json";
import { Icon } from "@/components/icons/Icon";
import type { Locale } from "@/i18n/routing";
import type { HomeText } from "@/features/content/home-fields";

/*
 * Hero scene art direction: one flattened image per Figma layout (Hero/Scene 296:531), applied as a CSS
 * `background-image: image-set(...)` per media query. The style engine downloads only the rule that
 * matches, so exactly one hero image is requested (e2e "hero loads exactly one image" counts the
 * requests at 1440 and 390). A `<picture>` with `<source media>` was tried first: Chromium's preload
 * scanner in phone emulation requested the 1920 source as well, i.e. two downloads. `getImageProps`
 * builds each 1x / 2x pair through the project's custom loader (manifest keys only).
 * Desktop uses the existing wide 1920x630 composition at its natural aspect ratio below the
 * header. Smaller layouts retain their original scenes: 768 -> 704x330 and
 * 390 / 360 -> 358x168 / 328x154 (inset, headline below).
 * The scene is decorative (the headline is live text), so it is a presentational element.
 */
const SCENES = [
  { media: null, key: "360", width: 328, height: 154 },
  { media: "(min-width: 390px)", key: "390", width: 358, height: 168 },
  { media: "(min-width: 768px)", key: "768", width: 704, height: 330 },
  { media: "(min-width: 1024px)", key: "1920", width: 1920, height: 630 },
] as const;

/*
 * LCP: from 1024 px the scene is the largest paint. A CSS background is only discovered after the
 * stylesheet, so the 1024–1919 desktop range preloads its scene. Keep the upper media bound:
 * Chromium's phone preload scanner can request an unbounded desktop preload as well as the
 * phone's CSS scene. At >=1920 CSS discovers the same single image without a preload.
 */
const PRELOAD_MEDIA: Record<string, string> = {
  "1920": "(min-width: 1024px) and (max-width: 1919.98px)",
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

/** Home v2 art direction with the approved compact desktop composition.
 * compact.css overrides the source geometry and keeps the mobile headline/search in normal flow.
 * Search uses native details and submits a GET request to the localized catalog.
 * The brand slogan is always English, independently of the locale and CMS overrides.
 */
export function Hero({
  locale,
  text,
}: {
  locale: Locale;
  text?: HomeText["values"];
}) {
  const t = useTranslations("pages.home.hero");
  const field = useTranslations("components.search");

  return (
    <section className="home-hero relative flex flex-col items-end gap-4 px-(--layout-margin) pt-4 pb-6 max-md:h-[46px] md:gap-5 lg:h-[470px] lg:items-start lg:p-0 min-[90rem]:h-[630px]">
      <div className="relative aspect-[358/168] w-full shrink-0 overflow-clip lg:absolute lg:inset-0 lg:aspect-auto">
        <HeroScene />
      </div>
      <div className="home-hero-intro flex w-full shrink-0 flex-col items-end gap-4 md:max-lg:h-[46px] lg:relative lg:mx-auto lg:max-w-[1440px] lg:items-start lg:gap-3 lg:pt-[87px] lg:pr-6 lg:pl-[43px] min-[90rem]:gap-4 min-[90rem]:pt-[122px] min-[90rem]:pl-[131px] min-[120rem]:max-w-none min-[120rem]:gap-[21px] min-[120rem]:pt-[163px] min-[120rem]:pl-[188px]">
        <h1
          lang="en"
          className="type-hero-headline text-primary lg:text-ink w-full uppercase"
        >
          <span className="lg:block">{en.pages.home.hero.line1}</span>{" "}
          <span className="lg:block">{en.pages.home.hero.line2}</span>{" "}
          <span className="lg:block">{en.pages.home.hero.line3}</span>{" "}
          <span className="lg:block">{en.pages.home.hero.line4}</span>
        </h1>
        <form
          role="search"
          action={`/${locale}/catalog`}
          method="get"
          className="relative has-[details[open]]:z-20"
        >
          <details className="group">
            <summary className="focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus hov:border-glass-strong motion-hover lg:text-primary flex h-[46px] w-[168px] cursor-pointer list-none items-center justify-center gap-4 rounded-full border border-[rgba(255,255,255,0.1)] bg-linear-to-b from-[rgba(76,80,83,0.2)] to-[rgba(65,68,72,0.2)] text-[16px] leading-5 font-medium outline-0 drop-shadow-[0_8px_10px_rgba(20,23,26,0.35)] select-none group-open:from-[rgba(88,92,96,0.2)]! group-open:to-[rgba(74,77,81,0.2)]! md:from-[#4c5053] md:to-[#414448] [&::-webkit-details-marker]:hidden">
              <Icon name="search" className="size-5!" />
              <span>
                {text?.["hero.searchPlaceholder"] ?? t("searchPlaceholder")}
              </span>
            </summary>
            <input
              type="search"
              name="q"
              aria-label={text?.["hero.searchLabel"] ?? t("searchLabel")}
              placeholder={field("placeholder")}
              className="type-catalog-field-value text-stone-catalog-ink placeholder:text-stone-catalog-secondary border-stone-catalog-line bg-stone-catalog-card focusv:border-ink-primary focusv:outline-1 focusv:-outline-offset-1 focusv:outline-ink-primary absolute top-full left-0 mt-2 block h-[52px] w-[168px] appearance-none rounded-[12px] border px-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] outline-0 [&::-webkit-search-cancel-button]:hidden"
            />
          </details>
        </form>
      </div>
    </section>
  );
}
