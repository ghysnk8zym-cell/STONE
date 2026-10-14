"use client";

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

/*
 * Figma Carousel (Home v2 722:1316 and siblings): arrow 44, gap 16, a track of cards with the layout
 * card gap, arrows centred vertically. Phones (390) draw no arrows: the track bleeds to the panel
 * edges with the panel padding and is swiped.
 *
 * CSS scroll-snap does the work (`snap-x snap-mandatory`, cards `snap-start`); the arrows only call
 * `scrollBy` by one card plus the gap. `behavior` is `smooth` unless the user prefers reduced motion
 * (then `auto`, an instant jump). Prev / next are `disabled` at the ends, tracked from the scroll
 * position (`scroll` + `ResizeObserver`). No autoplay. The list holds no focusable stop of its own:
 * the cards' links are the tab stops, and the browser scrolls a focused card into view.
 */
export function Carousel({ label, itemClassName, children }: CarouselProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setAtStart(list.scrollLeft <= EDGE);
    setAtEnd(list.scrollLeft + list.clientWidth >= list.scrollWidth - EDGE);
  }, []);

  useEffect(() => {
    update();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const first = list.querySelector("li");
    const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
    const step = (first?.offsetWidth ?? list.clientWidth) + gap;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    list.scrollBy({
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
          disabled={atStart}
          onClick={() => scroll(-1)}
        />
      </span>
      <ul
        ref={listRef}
        onScroll={update}
        className={cn(
          "flex min-w-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] items-start gap-(--layout-card-gap) overflow-x-auto overflow-y-clip overscroll-x-contain [&::-webkit-scrollbar]:hidden",
          "max-md:scroll-px-(--layout-panel-pad) max-md:px-(--layout-panel-pad)",
        )}
      >
        {Children.toArray(children).map((child, index) => (
          <li key={index} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </li>
        ))}
      </ul>
      <span className="max-md:hidden">
        <CarouselArrow
          direction="next"
          disabled={atEnd}
          onClick={() => scroll(1)}
        />
      </span>
    </div>
  );
}
