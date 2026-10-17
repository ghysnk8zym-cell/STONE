import type { CSSProperties } from "react";

import { cn } from "../cn";

export type IconName =
  | "search"
  | "menu"
  | "close"
  | "arrow"
  | "bag"
  | "chevron"
  | "check"
  | "dismiss"
  | "back"
  | "heart"
  | "home"
  | "grid"
  | "user"
  | "eye";

export type IconSize = 12 | 16 | 24;

type IconProps = {
  name: IconName;
  size?: IconSize;
  className?: string;
};

/**
 * Figma icon rendered through CSS mask-image, so the glyph takes the surrounding
 * `color` (currentColor). The SVG files in public/icons/ are the unmodified Figma exports.
 * Decorative: always aria-hidden; the control that wraps it carries the accessible name.
 */
export function Icon({ name, size = 24, className }: IconProps) {
  const mask = `url(/icons/${name}.svg)`;
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: "currentColor",
    maskImage: mask,
    WebkitMaskImage: mask,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
  };
  return (
    <span
      aria-hidden="true"
      className={cn("icon-mask inline-block shrink-0", className)}
      style={style}
    />
  );
}
