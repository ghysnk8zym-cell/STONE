import { getImageProps } from "next/image";
import { useTranslations } from "next-intl";

import { SearchField } from "@/components/forms/SearchField";
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
 * Home v2 hero (Section / Hero 722:1304 at 1440, 722:1567 at 1024, 724:1673 at 768, 716:1084 at 390).
 *  - >= 1024: the scene is full-bleed behind the sticky header (the section is pulled up by the
 *    72 px header), 630 high at 1440 and 470 at 1024; the intro panel sits on it: headline in four
 *    lines (text/ink, Hero/Headline, tracking 0.14em) with the Search pill under it. Left / top offset
 *    131 / 122 at 1440, 43 / 87 at 1024; gap 16 / 12.
 *  - < 1024: header in the flow, scene inset 32 (16 at 390) wide with the 358:168 ratio, then the
 *    headline in one flowing line (text/primary) and the Search pill right-aligned, gap 16.
 *    Figma's 390 hero frame is a fixed 46 px high and the catalog panel overlaps the scene (an
 *    authoring slip); the intended flow is built here.
 * The Search pill is Figma's "Hero / Search" (168x46, graphite gradient, 20 px icon, 16/20 Medium
 * label). It opens the "Search panel" (971:28941) with the catalog SearchField as a native
 * <details>, so it needs no JavaScript; the form submits to /catalog?q=...
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = useTranslations("pages.home.hero");
  const field = useTranslations("components.search");

  return (
    <section className="relative flex flex-col items-end gap-4 px-(--layout-margin) pt-4 pb-6 lg:-mt-[72px] lg:h-[470px] lg:items-start lg:p-0 min-[90rem]:h-[630px]">
      <div className="relative aspect-[358/168] w-full overflow-clip lg:absolute lg:inset-0 lg:aspect-auto">
        <HeroScene />
      </div>
      <div className="flex w-full flex-col items-end gap-4 lg:relative lg:mx-auto lg:max-w-[1440px] lg:items-start lg:gap-3 lg:pt-[87px] lg:pr-6 lg:pl-[43px] min-[90rem]:gap-4 min-[90rem]:pt-[122px] min-[90rem]:pl-[131px]">
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
          className="relative"
        >
          <details className="group">
            <summary className="focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus hov:border-glass-strong motion-hover flex h-[46px] w-[168px] cursor-pointer list-none items-center justify-center gap-4 rounded-full border border-[rgba(255,255,255,0.1)] bg-linear-to-b from-[rgba(76,80,83,0.2)] to-[rgba(65,68,72,0.2)] text-[16px] leading-5 font-medium text-white outline-0 drop-shadow-[0_8px_10px_rgba(20,23,26,0.35)] select-none md:from-[#4c5053] md:to-[#414448] [&::-webkit-details-marker]:hidden">
              <Icon name="search" className="size-5!" />
              <span>{t("searchPlaceholder")}</span>
            </summary>
            <div className="absolute top-full right-0 z-20 mt-2 w-[min(260px,calc(100vw-2rem))] lg:right-auto lg:left-0">
              <SearchField
                name="q"
                tone="graphite"
                label={t("searchLabel")}
                placeholder={field("placeholder")}
              />
            </div>
          </details>
        </form>
      </div>
    </section>
  );
}
