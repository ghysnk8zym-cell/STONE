import type { ReactNode } from "react";

import { Button } from "@/components/buttons/Button";
import { Carousel } from "@/components/carousel/Carousel";

export type SectionAction = {
  label: string;
  /** Locale-free path. Omitted: the action is inert (rendered as a disabled non-link). */
  href?: string;
};

/*
 * Glass panel of Home v2 ("Section / Catalog banner" 722:1310, "Section / Promo products" 722:1326,
 * "Section / Our works" 722:1340 at 1440; 716:1105 / 716:1112 / 716:1119 at 390):
 * blur 12 (Blur/Glass background 24), fill surface/panel, border/glass, r20, shadow 0 16 40 rgba(0,0,0,.35),
 * max-width 1286, padding layout/panel-pad (24 at 1440, 16 at 390), gap 20 (12 on phones).
 * On phones the panel has no side padding: the header and the track carry the 16 px themselves so the
 * cards bleed to the panel edges while swiping (Figma Track overflow-x).
 * Header: Label (24 px rule + Section/Label, 12/16, tracking 0.12em, uppercase, text/label) and the
 * "Button/Pill" action (40 high, 44 on phones = layout/control-h).
 *
 * `note` is the placeholder-price line the owner approved (not in Figma): `type-catalog-meta` under the
 * label, in text/secondary because the panel is dark (the catalog meta colour is for light cards).
 */
export function ShowcaseSection({
  id,
  label,
  note,
  action,
  carouselClassName,
  children,
}: {
  /** Unique within the page: names the heading for `aria-labelledby`. */
  id: string;
  label: string;
  note?: string;
  action: SectionAction;
  /** Width classes of every carousel item (the cards). */
  carouselClassName: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="glass-blur glass-panel-veil border-glass bg-surface-panel flex w-full max-w-[1286px] shrink-0 flex-col gap-3 overflow-clip rounded-[20px] border py-(--layout-panel-pad) shadow-[0_16px_40px_rgba(0,0,0,0.35)] md:gap-5 md:px-(--layout-panel-pad)"
    >
      <div className="flex items-center justify-between gap-3 max-md:px-(--layout-panel-pad)">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="bg-divider-light h-px w-6" />
            <h2
              id={headingId}
              className="type-section-label text-label whitespace-nowrap uppercase"
            >
              {label}
            </h2>
          </div>
          {note !== undefined && (
            <p className="type-catalog-meta text-secondary">{note}</p>
          )}
        </div>
        {action.href === undefined ? (
          <Button variant="pill" inert iconRight="arrow" className="shrink-0">
            {action.label}
          </Button>
        ) : (
          <Button
            variant="pill"
            href={action.href}
            iconRight="arrow"
            className="shrink-0"
          >
            {action.label}
          </Button>
        )}
      </div>
      <Carousel label={label} itemClassName={carouselClassName}>
        {children}
      </Carousel>
    </section>
  );
}
