import { useTranslations } from "next-intl";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import type { InteractionState } from "./Button";
import { ROUND_GLASS } from "./round-glass";

export type CarouselArrowProps = {
  direction: "prev" | "next";
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Same look as `disabled`, but the button stays focusable (`aria-disabled`, click ignored): a
   * keyboard user who reaches the end of a carousel keeps focus on the arrow instead of losing it.
   */
  softDisabled?: boolean;
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
};

/*
 * Figma Carousel/Arrow 712:489: 44x44 touch target, fill surface/button, border/glass, 20 px
 * Icon/Arrow in icon/light. Prev is the same arrow rotated 180 degrees (component description).
 * Figma draws only the resting Prev / Next, so hover, focus, pressed and disabled reuse the
 * round glass states of Icon button (documented in the Task 5 report).
 */
export function CarouselArrow({
  direction,
  onClick,
  disabled = false,
  softDisabled = false,
  state,
}: CarouselArrowProps) {
  const t = useTranslations("components.carousel");
  return (
    <button
      type="button"
      aria-label={t(direction)}
      className={cn(ROUND_GLASS, "bg-surface-button text-icon-light size-11")}
      data-state={state}
      disabled={disabled}
      aria-disabled={softDisabled ? "true" : undefined}
      onClick={softDisabled ? undefined : onClick}
    >
      <Icon
        name="arrow"
        className={cn("size-5!", direction === "prev" && "rotate-180")}
      />
    </button>
  );
}
