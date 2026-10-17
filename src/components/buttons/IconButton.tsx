import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon, type IconName } from "../icons/Icon";
import type { InteractionState } from "./Button";
import { ROUND_GLASS } from "./round-glass";

export type IconButtonProps = {
  icon: IconName;
  /** Accessible name (aria-label). Required: the control has no visible text. */
  label: string;
  /** `glass` on dark surfaces (header, menus), `light` for the catalog card heart, `ink` for the back button on the light catalog pages. */
  tone?: "glass" | "light" | "ink";
  href?: string;
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
  disabled?: boolean;
  /** Not built yet: default look, non-link `<span role="link" aria-disabled>`, no reaction, no dim. */
  inert?: boolean;
  onClick?: () => void;
  /** Disclosure trigger (menu button): sets `aria-expanded`. */
  expanded?: boolean;
  /** Kind of popup the button opens (menu button: "dialog"): sets `aria-haspopup`. */
  haspopup?: "dialog";
  /** The link points at the page the user is on: sets `aria-current="page"` (no extra look in Figma). */
  current?: boolean;
  /** Toggle state (heart): sets `aria-pressed`. */
  pressed?: boolean;
};

/*
 * Glass tone: Figma "Icon button" 21:125, 46x46, fill surface/nav-pill, glyph 22 (User 24).
 * Light tone: the Heart on the catalog card (Catalog 1440 > Card 922:25514 > Heart 713:520):
 * a 36 px bubble (stone/catalog-card fill, stone/catalog-line border, 20 px glyph in text/ink)
 * inside a 44 px touch target, which is the ::before below. The card places it 2 px from the
 * media corner, so the bubble sits 6 px in. Figma draws no hover / focus / pressed for it;
 * those use the closest catalog tokens (documented in the Task 5 report).
 */
const TONE = {
  glass: cn(ROUND_GLASS, "size-[46px] bg-surface-nav-pill text-icon-light"),
  light: cn(
    "relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-catalog-line bg-stone-catalog-card text-ink outline-0 select-none motion-hover before:absolute before:-inset-1 before:content-['']",
    "hov:border-stone-catalog-secondary hov:bg-stone-catalog-photo",
    "focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus",
    "press:bg-stone-catalog-photo press:shadow-[inset_0_1px_3px_rgba(27,29,32,0.2)]",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
  ),
  // Figma "Action / Back" (Catalog 1440 > Back row 1006:41371): 46 px, surface/nav-pill fill, 1 px text/ink border.
  // Hover / focus / pressed are not drawn: same tint as the outline Button.
  ink: "inline-flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-ink bg-surface-nav-pill text-ink outline-0 select-none motion-hover hov:bg-overlay-tint-10 focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus press:bg-overlay-tint-10 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
} as const;

/** Inert look: the resting look of each tone, no hover / focus / pressed / dim. */
const INERT = {
  glass:
    "inline-flex size-[46px] shrink-0 cursor-default items-center justify-center rounded-full border border-glass bg-surface-nav-pill text-icon-light select-none",
  light:
    "relative inline-flex size-9 shrink-0 cursor-default items-center justify-center rounded-full border border-stone-catalog-line bg-stone-catalog-card text-ink select-none before:absolute before:-inset-1 before:content-['']",
  ink: "inline-flex size-[46px] shrink-0 cursor-default items-center justify-center rounded-full border border-ink bg-surface-nav-pill text-ink select-none",
} as const;

/** Figma: 22 px glyph in the 46 px button, except the User glyph (24) at rest; 20 px in the heart bubble. */
function glyphClass(icon: IconName, tone: "glass" | "light" | "ink") {
  if (tone === "light") return "size-5!";
  return icon === "user" ? undefined : "size-[22px]!";
}

/**
 * Round icon-only button. Renders `<button type="button">`, or the locale-aware `Link` when `href`
 * is given; a disabled link renders as a non-link `<span role="link" aria-disabled>` without href.
 * The glyph is decorative, `label` is the accessible name.
 */
export function IconButton({
  icon,
  label,
  tone = "glass",
  href,
  state,
  disabled = false,
  inert = false,
  onClick,
  pressed,
  expanded,
  haspopup,
  current = false,
}: IconButtonProps) {
  const classes = inert ? INERT[tone] : TONE[tone];
  // Figma draws no pressed heart: a saved one is the same outline filled with ink.
  const glyph = (
    <Icon
      name={icon === "heart" && pressed ? "heart-filled" : icon}
      className={glyphClass(icon, tone)}
    />
  );

  if (href !== undefined) {
    if (disabled || inert) {
      return (
        <span
          role="link"
          aria-label={label}
          aria-disabled="true"
          data-state={state}
          className={classes}
        >
          {glyph}
        </span>
      );
    }
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={current ? "page" : undefined}
        data-state={state}
        className={classes}
      >
        {glyph}
      </Link>
    );
  }

  if (inert) {
    // no destination at all (e.g. the card heart): an announced, disabled button that does nothing
    return (
      <span
        role="button"
        aria-label={label}
        aria-disabled="true"
        data-state={state}
        className={classes}
      >
        {glyph}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-haspopup={haspopup}
      className={classes}
      data-state={state}
      disabled={disabled}
      onClick={onClick}
    >
      {glyph}
    </button>
  );
}
