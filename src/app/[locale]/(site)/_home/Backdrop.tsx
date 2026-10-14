import Image from "next/image";

/*
 * Home v2 "Background" (722:1301 at 1440, 722:1565 at 1024, 724:1670 at 768, 716:1061 at 390): the light
 * rock photo ("555 1", one source image in every layout) behind the translucent glass panels, faded
 * into the page colour. Geometry from the screens (the page root starts at y = 0 from 768 px, under
 * the header; at 390 it starts under the 72 px header, so those tops are 72 less than in Figma):
 *   1440 / 1024: 1984x2514 at x = centre - 32, y = 306
 *   768:         1984x2514 at x = centre - 32, y = 444
 *   390:         790x1100  at x = centre,      y = 374 (302 here)
 * "Fade to page": linear 180deg page colour 0 -> 0 at 70% -> solid at 100% plus a flat 10 % dark
 * 90deg veil, over the whole 2545 px background (1440, 1024), the photo box from y = 444 (768) or the
 * photo box (390). 768 / 390 add a 200 px "Fade from hero" from solid page colour to transparent at the
 * photo's top edge. One <img> in every layout, lazy: it is requested once.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-clip"
    >
      <Image
        src="images/home/backdrop"
        alt=""
        width={1788}
        height={2266}
        sizes="(min-width: 768px) 1984px, 790px"
        className="absolute top-[302px] left-1/2 h-[1100px] w-[790px] max-w-none -translate-x-1/2 object-cover md:top-[444px] md:-ml-8 md:h-[2514px] md:w-[1984px] lg:top-[306px]"
      />
      <div className="absolute inset-x-0 top-[302px] h-[1100px] bg-[linear-gradient(180deg,rgba(27,29,32,0)_0%,rgba(27,29,32,0)_70%,rgb(27,29,32)_100%),linear-gradient(90deg,rgba(16,17,17,0.1),rgba(16,17,17,0.1))] md:top-[444px] md:h-[2101px] lg:top-0 lg:h-[2545px]" />
      <div className="absolute inset-x-0 top-[302px] h-[200px] bg-linear-to-b from-[#1b1d20] to-[rgba(27,29,32,0)] md:top-[444px] lg:hidden" />
    </div>
  );
}
