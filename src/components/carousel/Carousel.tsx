"use client";

import { useTranslations } from "next-intl";
import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { CarouselArrow } from "../buttons/CarouselArrow";
import { cn } from "../cn";

export type CarouselProps = {
  /** Accessible name of the carousel group (the section title). */
  label: string;
  /**
   * Classes of every `<li>` that fix the card width (Figma: 148 / 240 / 280 px on phones, 222 / 297 /
   * 356 px from 768). The card itself fills the item.
   */
  itemClassName?: string;
  children: ReactNode;
};

/** Tolerance for sub-pixel scroll positions on high-density screens. */
const EDGE = 2;
const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Figma Carousel (Home v2 722:1316 and siblings): arrow 44, gap 16, a track of cards with the layout
 * card gap, arrows centred vertically. Phones (390) draw no arrows: the track bleeds to the panel
 * edges with the panel padding and is swiped.
 *
 * CSS scroll-snap does the work (`snap-x snap-mandatory`, cards `snap-start`); the arrows only call
 * `scrollBy` by one card plus the gap. `behavior` is `smooth` unless the user prefers reduced motion
 * (then `auto`, an instant jump). At the ends the arrows are `aria-disabled` (same look as Figma's
 * disabled arrow) rather than `disabled`, and clicks are ignored: the focused arrow stays focusable,
 * so keyboard focus never drops to <body> when a step reaches the end. No autoplay.
 * The scroller is a `div` around the `<ul>`. Cards with links give keyboard users their tab stops (the
 * browser scrolls a focused card into view); a track without any focusable item (the works cards)
 * becomes a focusable, labelled region so it can still be scrolled with the arrow keys.
 */
export function Carousel({ label, itemClassName, children }: CarouselProps) {
  const t = useTranslations("components.carousel");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [needsFocusStop, setNeedsFocusStop] = useState(false);

  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setAtStart(scroller.scrollLeft <= EDGE);
    setAtEnd(
      scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - EDGE,
    );
  }, []);

  useEffect(() => {
    update();
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setNeedsFocusStop(scroller.querySelector(FOCUSABLE) === null);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (direction === -1 ? atStart : atEnd) return;
    const first = scroller.querySelector("li");
    const list = scroller.querySelector("ul");
    const gap =
      Number.parseFloat(getComputedStyle(list ?? scroller).columnGap) || 0;
    const step = (first?.offsetWidth ?? scroller.clientWidth) + gap;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroller.scrollBy({
      left: direction * step,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-4 max-md:block"
    >
      <span className="max-md:hidden">
        <CarouselArrow
          direction="prev"
          softDisabled={atStart}
          onClick={() => scroll(-1)}
        />
      </span>
      <div
        ref={scrollerRef}
        onScroll={update}
        role={needsFocusStop ? "region" : undefined}
        aria-label={needsFocusStop ? t("scrollable", { label }) : undefined}
        tabIndex={needsFocusStop ? 0 : undefined}
        className="focus-visible:outline-accent-focus min-w-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overflow-y-clip overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 max-md:scroll-px-(--layout-panel-pad) [&::-webkit-scrollbar]:hidden"
      >
        <ul
          className={cn(
            "flex w-max min-w-full items-start gap-(--layout-card-gap)",
            "max-md:px-(--layout-panel-pad)",
          )}
        >
          {Children.toArray(children).map((child, index) => (
            <li
              key={index}
              className={cn("shrink-0 snap-start", itemClassName)}
            >
              {child}
            </li>
          ))}
        </ul>
      </div>
      <span className="max-md:hidden">
        <CarouselArrow
          direction="next"
          softDisabled={atEnd}
          onClick={() => scroll(1)}
        />
      </span>
    </div>
  );
}
