import { cn } from "../cn";

/**
 * Shared look of the round glass controls (IconButton 46, CarouselArrow 44, SocialButton 44).
 * Figma binds the same variables on all three: border/glass, border/glass-strong,
 * surface/card-hover, accent-focus. Only the resting fill differs (`surface-nav-pill` vs
 * `surface-button`, equal values), so each component adds its own `bg-*`.
 * Focus: Figma draws a 2px accent-focus border; the 1px border is recoloured and a 1px inset
 * outline adds the second pixel, so the size never changes.
 * Pressed: ripple (CSS, see globals.css) + the strong border and an inset shadow from the Figma
 * RippleStart / ReducedPressed variants. Disabled: opacity 45%.
 */
export const ROUND_GLASS = cn(
  "ripple inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-glass outline-0 select-none motion-hover after:-z-10",
  "hov:border-glass-strong hov:bg-surface-card-hover",
  "focusv:border-accent-focus focusv:outline-1 focusv:-outline-offset-2 focusv:outline-accent-focus",
  "press:border-glass-strong press:bg-surface-card-hover press:shadow-[inset_0_1px_3px_rgba(27,29,32,0.2)]",
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
);
