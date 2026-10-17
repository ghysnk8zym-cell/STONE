import { getImageProps } from "next/image";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/icons/Icon";
import { Link } from "@/i18n/navigation";

/*
 * Frame of the sign-in and sign-up screens: Figma "Create account" (431:3193 at 1440, 840:21796 at 1920,
 * 840:21822 at 1024, 840:21848 at 768, 431:3250 at 390, 840:21874 at 360). Sign-in is the same layout
 * (owner decision, spec section 1). No site header or footer: the screens draw none.
 *  - From 1024 the stone photo is the landscape image and the form sits on its left, vertically centred
 *    (left offset 56 / 116 / 200 at 1024 / 1440 / 1920), with "Back to products" in a top bar on the right.
 *  - Below 1024 the photo is the portrait image, the form is pinned to the bottom (side padding 64 / 32 / 16
 *    at 768 / 390 / 360) and "Back to products" sits below it, 84 px above the bottom edge on phones.
 * The photo is decorative. Like the home hero, it is a CSS `image-set()` per media query, so the browser
 * requests exactly one file (e2e "auth background loads exactly one image"); `getImageProps` builds each
 * 1x / 2x pair through the project's loader (manifest keys only). Sources are 1672x940 and 941x1672, never
 * upscaled: the widest file is 1440 px and wider screens scale it with `background-size: cover`.
 * The legibility gradient is the Figma one: left to right 55 % -> 12 % (50 %) -> 0 (75 %) beside the photo,
 * top to bottom 0 -> 10 % (40 %) -> 70 % over it.
 */
const SCENES = [
  { media: null, key: "portrait", width: 390, height: 693 },
  { media: "(min-width: 768px)", key: "portrait", width: 768, height: 1365 },
  { media: "(min-width: 1024px)", key: "landscape", width: 1024, height: 576 },
  { media: "(min-width: 1440px)", key: "landscape", width: 1440, height: 810 },
] as const;

// Preloads are exclusive of each other (and none below 1024 or from 1920), like the hero: Chromium's phone
// emulation evaluates an open-ended `min-width` link media as true at parse time and would fetch a second image.
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

function AuthScene() {
  const rules = SCENES.map((scene) => {
    const { srcSet } = getImageProps({
      src: `images/auth/create-account-${scene.key}`,
      alt: "",
      width: scene.width,
      height: scene.height,
    }).props;
    const preloadMedia = PRELOAD_MEDIA[String(scene.width)];
    if (scene.key === "landscape" && preloadMedia && srcSet) {
      preload(srcSet.split(" ")[0], {
        as: "image",
        imageSrcSet: srcSet,
        fetchPriority: "high",
        media: preloadMedia,
      });
    }
    const rule = `.auth-scene{background-image:${imageSet(srcSet)}}`;
    return scene.media === null ? rule : `@media ${scene.media}{${rule}}`;
  }).join("");

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <style>{rules}</style>
      <div className="auth-scene absolute inset-0 bg-cover bg-center bg-no-repeat" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,22,23,0)_0%,rgba(20,22,23,0.1)_40%,rgba(20,22,23,0.7)_100%)] lg:bg-[linear-gradient(to_right,rgba(20,22,23,0.55)_0%,rgba(20,22,23,0.12)_50%,rgba(20,22,23,0)_75%)]" />
    </div>
  );
}

function BackToProducts() {
  const t = useTranslations("auth");
  return (
    <div className="relative z-10 flex justify-end px-4 pt-4 pb-[84px] md:pb-0 lg:order-first lg:px-10 lg:pt-7 lg:pb-0">
      <Link
        href="/catalog"
        className="text-ink-on-dark focusv:outline-2 focusv:outline-accent-focus motion-hover focusv:outline-offset-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 text-[16px] leading-normal outline-0 lg:text-[20px]"
      >
        {t("backToProducts")}
        <Icon name="arrow" className="size-5! lg:size-6!" />
      </Link>
    </div>
  );
}

/** The page title of an auth screen (`h1`): Lusitana, sized per breakpoint (type-auth-title). */
export function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="type-auth-title text-ink-on-dark mb-5 min-[390px]:mb-7 lg:mb-9">
      {children}
    </h1>
  );
}

/** The form column: 360 / 440 / 480 px wide from 1024, 480 at 768 and the full width on phones. */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col">
      <AuthScene />
      <div className="relative flex flex-1 flex-col justify-end px-4 pb-12 min-[390px]:px-8 md:px-16 lg:justify-center lg:pr-0 lg:pb-[72px] lg:pl-14 min-[90rem]:pl-[116px] min-[120rem]:pl-[200px]">
        <div className="flex w-full flex-col items-start md:w-[480px] lg:w-[360px] min-[90rem]:w-[440px] min-[120rem]:w-[480px]">
          {children}
        </div>
      </div>
      <BackToProducts />
    </div>
  );
}
