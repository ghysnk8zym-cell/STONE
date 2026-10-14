import type { ReactNode } from "react";

import { cn } from "../cn";

/**
 * Discount pill from the Catalog card (Catalog 390 > Card / Concrete Paver 922:26346 > Badge
 * 713:549): `surface/page` fill, `text/primary` label in the Button/Label style, 12 x 4 padding,
 * fully round. The card positions it (8 px from the media corner); the Badge itself is inline.
 */
export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-surface-page text-primary type-button-label inline-flex items-start rounded-full px-3 py-1 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}
