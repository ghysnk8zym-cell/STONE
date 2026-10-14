import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/components/cn";

import type { QaId } from "./sections/qa-ids";

/**
 * Ground an example sits on: the dark page, the light marble catalog page, or none (the example
 * brings its own photo frame).
 */
type Tone = "dark" | "light";

const TONE: Record<Tone, string> = {
  dark: "bg-surface-page border-glass",
  light:
    "bg-stone-catalog-page text-stone-catalog-ink border-stone-catalog-line",
};

type ExampleProps = {
  "data-qa": QaId;
  /** Visible caption above the example, also its accessible name. */
  caption: string;
  tone?: Tone;
  /** Full viewport width (headers, footer, tab bar): breaks out of the page margin, no padding. */
  bleed?: boolean;
  /** Stage as wide as its column (lists and grids) instead of hugging the component. */
  wide?: boolean;
  /** Classes for the outer block (visibility per breakpoint). */
  className?: string;
  /** Classes for the `data-qa` element (a fixed width, a minimum height). */
  stageClassName?: string;
  children: ReactNode;
};

/**
 * One example: caption, then the `data-qa` element that holds the bare component (so Task 10 can
 * screenshot `[data-qa="…"]` at 1440 and 390 without the caption in the image). The element is a
 * labelled group, not a landmark.
 */
export function Example({
  "data-qa": qa,
  caption,
  tone = "dark",
  bleed = false,
  wide = false,
  className,
  stageClassName,
  children,
}: ExampleProps) {
  const captionId = `${qa}-caption`;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        bleed && "-mx-(--layout-margin)",
        className,
      )}
    >
      <p
        id={captionId}
        className={cn(
          "type-catalog-meta text-secondary",
          bleed && "px-(--layout-margin)",
        )}
      >
        {caption}
      </p>
      <div
        data-qa={qa}
        role="group"
        aria-labelledby={captionId}
        className={cn(
          "relative",
          bleed
            ? "w-full"
            : cn(
                wide ? "w-full" : "w-fit",
                "max-w-full border p-2 md:p-4",
                TONE[tone],
              ),
          stageClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A titled row of examples (h3 under the section's h2). */
export function Group({
  title,
  note,
  stack = false,
  children,
}: {
  title: string;
  note?: string;
  /** One example per row (full-width blocks) instead of a wrapping row. */
  stack?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="type-card-title text-primary">{title}</h3>
      {note ? <p className="type-body-m text-secondary">{note}</p> : null}
      <div
        className={cn(
          "gap-x-6 gap-y-8",
          stack ? "flex flex-col" : "flex flex-wrap items-start",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A top-level section: labelled landmark region with its h2. */
export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="border-glass flex scroll-mt-6 flex-col gap-10 border-t pt-10"
    >
      <div className="flex flex-col gap-3">
        <h2 id={headingId} className="type-catalog-page-title-56 text-primary">
          {title}
        </h2>
        {intro ? (
          <p className="type-body-m text-secondary max-w-prose">{intro}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Figma hero texture behind glass components (header, tab bar, footer, effects). The frame
 * isolates its stacking context so the image stays behind the content, and its `transform` makes
 * it the containing block of fixed descendants: the fixed TabBar is positioned against the frame,
 * not the viewport, so the page is not covered and the component itself is unchanged.
 */
export function PhotoFrame({
  children,
  className,
  scene = "images/hero/scene-1024",
}: {
  children: ReactNode;
  className?: string;
  scene?: "images/hero/scene-1024" | "images/hero/scene-1440";
}) {
  return (
    <div
      className={cn(
        "relative isolate [transform:translateZ(0)] overflow-clip",
        className,
      )}
    >
      <Image
        src={scene}
        alt=""
        fill
        loading="eager"
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {children}
    </div>
  );
}
