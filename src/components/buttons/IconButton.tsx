import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon, type IconName } from "../icons/Icon";
import type { InteractionState } from "./Button";
import { ROUND_GLASS } from "./round-glass";

export type IconButtonProps = {
  icon: IconName;
  /** Accessible name (aria-label). Required: the control has no visible text. */
  label: string;
  /** `glass` on dark surfaces (header, menus), `light` for the catalog card heart. */
  tone?: "glass" | "light";
  href?: string;
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
  disabled?: boolean;
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
} as const;

/** Figma: 22 px glyph in the 46 px button, except the User glyph (24) at rest; 20 px in the heart bubble. */
function glyphClass(icon: IconName, tone: "glass" | "light") {
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
  onClick,
  pressed,
  expanded,
  haspopup,
  current = false,
}: IconButtonProps) {
  const classes = TONE[tone];
  const glyph = <Icon name={icon} className={glyphClass(icon, tone)} />;

  if (href !== undefined) {
    if (disabled) {
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
