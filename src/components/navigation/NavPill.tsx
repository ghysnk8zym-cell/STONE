import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import type { InteractionState } from "../buttons/Button";
import { cn } from "../cn";

type CommonProps = {
  children: ReactNode;
  /** The pill points at the page the user is on: Figma "Current" look + `aria-current="page"`. */
  current?: boolean;
  disabled?: boolean;
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
  /** Needed when the visible label is not the accessible name (language switch). */
  "aria-label"?: string;
  className?: string;
};

export type NavPillProps = CommonProps &
  (
    | { href: string; onClick?: never }
    | { href?: undefined; onClick?: () => void }
  );

/*
 * Figma Nav/Pill 21:79 (variants Default 21:73, Hover 21:75, Focus 21:77, RippleStart 118:46,
 * Disabled 118:50, Reduced 118:52, Current 344:483). 46 px high, 16 px side padding, Lusitana
 * "Nav/Link" label (size per breakpoint, --type-nav-size). Bound variables (get_variable_defs):
 * surface/nav-pill, border/glass, border/glass-strong, surface/card-hover, accent-focus, text/primary.
 * Current has no bound fill or border in Figma: rgba(255,255,255,0.26) / rgba(255,255,255,0.55).
 *
 * One set of colour classes per look (cn() is not twMerge, so nothing here is overridden):
 *  - IDLE: default + hover (fill 10% + border 24%, component description) + pressed.
 *  - CURRENT: its own fill and border; hover and pressed keep the Current look (the 10% hover
 *    fill would make the current item look weaker than its neighbours). Only the focus ring and
 *    the ripple still apply.
 * Focus: Figma draws a 2px accent-focus border; the 1px border is recoloured and a 1px inset
 * outline adds the second pixel, so the size never changes (same as the round glass buttons).
 */
const BASE = cn(
  "ripple inline-flex h-[46px] max-w-full min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-full border px-4 text-primary type-nav-link whitespace-nowrap outline-0 select-none motion-hover after:-z-10",
  "focusv:border-accent-focus focusv:outline-1 focusv:-outline-offset-1 focusv:outline-accent-focus",
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
);

const IDLE = cn(
  "border-glass bg-surface-nav-pill",
  "hov:border-glass-strong hov:bg-surface-card-hover",
  "press:border-glass-strong press:bg-surface-card-hover press:shadow-[inset_0_1px_3px_rgba(27,29,32,0.2)]",
);

const CURRENT = "border-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.26)]";

/**
 * Header pill. Renders the locale-aware `Link` when `href` is given, otherwise a `<button
 * type="button">` (language switch). A disabled link is a non-link `<span role="link"
 * aria-disabled>` without href, like Button and IconButton.
 */
export function NavPill(props: NavPillProps) {
  const {
    children,
    current = false,
    disabled = false,
    state,
    className,
  } = props;
  const ariaLabel = props["aria-label"];
  const classes = cn(BASE, current ? CURRENT : IDLE, className);

  if (props.href !== undefined) {
    if (disabled) {
      return (
        <span
          role="link"
          aria-label={ariaLabel}
          aria-disabled="true"
          data-state={state}
          className={classes}
        >
          <span className="min-w-0 truncate">{children}</span>
        </span>
      );
    }
    return (
      <Link
        href={props.href}
        aria-label={ariaLabel}
        aria-current={current ? "page" : undefined}
        data-state={state}
        className={classes}
      >
        <span className="min-w-0 truncate">{children}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-state={state}
      disabled={disabled}
      onClick={props.onClick}
      className={classes}
    >
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
