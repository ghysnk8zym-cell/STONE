// Client component: the loading state needs a click handler (see onClick below). Server components can still render it.
"use client";

import { useTranslations } from "next-intl";
import type { MouseEvent, ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon, type IconName, type IconSize } from "../icons/Icon";

/** Frozen interaction state, rendered as `data-state` (styleguide only). */
export type InteractionState = "hover" | "focus" | "pressed";

export type ButtonVariant =
  "pill" | "primary" | "light" | "outline" | "graphite" | "save";

type CommonProps = {
  variant?: ButtonVariant;
  /** Icon before the label. `save` shows the Figma heart unless another icon is given. */
  iconLeft?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  /**
   * Not built yet: the default look of the variant, rendered as a non-interactive
   * `<span role="link" | "button" aria-disabled>` (link when `href` is given, otherwise button): no
   * navigation, no hover / pressed reaction, no 45 % dim, not focusable.
   */
  inert?: boolean;
  state?: InteractionState;
  children: ReactNode;
  className?: string;
};

/** `loading` exists only for `type: "submit"` (owner decision). */
export type ButtonProps = CommonProps &
  (
    | { href: string; type?: never; loading?: never; onClick?: never }
    | {
        href?: undefined;
        type?: "button";
        loading?: never;
        onClick?: () => void;
      }
    | {
        href?: undefined;
        type: "submit";
        loading?: boolean;
        onClick?: () => void;
      }
  );

/* Disabled look. State variants (hov / press) already skip disabled elements, see globals.css. */
const DISABLED =
  "disabled:pointer-events-none aria-disabled:pointer-events-none";
const DISABLED_DIM = "disabled:opacity-45 aria-disabled:opacity-45";

/* Pills are single-line and fixed-height (Figma): a label longer than the column is truncated with an ellipsis
   (the BASE root is max-w-full, the label span truncates, icons and spinner keep their size). */
/* Keyboard focus ring for variants whose Figma component has no Focus state. */
const FOCUS_RING =
  "focusv:outline-2 focusv:outline-accent-focus focusv:outline-offset-2";

const BASE =
  "inline-flex max-w-full min-w-0 items-center justify-center whitespace-nowrap select-none cursor-pointer outline-0 motion-hover";

/*
 * Values come from the Figma component sets (Button/Pill 21:95, Primary 338:533, Light 430:479,
 * Outline 732:712, Graphite 733:6134, Save 779:546). Wherever Figma binds a variable (get_variable_defs)
 * a token is used, including `ink/on-dark` on the Primary label. Fills of Primary, Light and Graphite
 * and the Light label are plain hex / rgba in Figma (no variable bound), so they stay arbitrary values. Hover / pressed of Outline, Graphite and Save are not drawn in Figma:
 * they use the closest tokens (documented in the Task 4 report).
 */
const VARIANT: Record<ButtonVariant, string> = {
  pill: cn(
    "ripple h-(--layout-control-h) gap-2 rounded-full border border-glass bg-surface-button pr-3.5 pl-4 text-primary type-button-label after:-z-10",
    "hov:border-glass-strong hov:bg-surface-card-hover",
    "focusv:border-accent-focus focusv:outline-1 focusv:-outline-offset-2 focusv:outline-accent-focus",
    "press:border-glass-strong press:bg-surface-card-hover press:shadow-[inset_0_1px_3px_rgba(27,29,32,0.2)]",
    DISABLED_DIM,
  ),
  primary: cn(
    // 2px transparent border keeps the size equal to Figma while the focus border does not shift layout.
    "gap-2.5 rounded-full border-2 border-transparent bg-[#1f2226] px-[26px] py-3 text-ink-on-dark shadow-[0_6px_8px_rgba(31,33,38,0.22)] type-catalog-button",
    "hov:bg-[#33373c]",
    "focusv:border-primary",
    "press:bg-[#121417] press:shadow-none",
    "disabled:bg-[rgba(31,34,38,0.35)] disabled:shadow-none aria-disabled:bg-[rgba(31,34,38,0.35)] aria-disabled:shadow-none",
  ),
  light: cn(
    "h-[60px] gap-2 rounded-[14px] border-2 border-transparent bg-[#f2f3f5] px-6 text-[20px] leading-normal font-medium text-[#1f2226]",
    "hov:bg-[#ffffff] hov:shadow-[0_6px_9px_rgba(0,0,0,0.25)]",
    "focusv:border-[#1f2226]",
    "press:bg-[#dbdee3] press:shadow-none",
    DISABLED_DIM,
  ),
  outline: cn(
    "h-[46px] gap-2 rounded-full border border-ink px-6 text-ink type-catalog-action",
    "hov:bg-overlay-tint-10",
    FOCUS_RING,
    "press:bg-overlay-tint-10",
    DISABLED_DIM,
  ),
  graphite: cn(
    "ripple h-[46px] gap-2 rounded-full border border-surface-card-hover bg-linear-to-b from-[rgba(76,80,83,0.2)] to-[rgba(65,68,72,0.2)] px-6 text-primary shadow-[0_8px_10px_rgba(20,23,26,0.35)] type-catalog-action after:-z-10",
    "hov:border-glass-strong",
    FOCUS_RING,
    DISABLED_DIM,
  ),
  save: cn(
    "h-11 gap-2 rounded-full border border-ink pr-[18px] pl-4 text-ink type-catalog-action",
    "hov:bg-overlay-tint-10",
    FOCUS_RING,
    "press:bg-overlay-tint-10",
    DISABLED_DIM,
  ),
};

const INERT_BASE =
  "inline-flex max-w-full min-w-0 cursor-default items-center justify-center whitespace-nowrap select-none";

/* Inert (not built yet): only the resting look of a variant; no hov / press / focus classes. */
const INERT: Record<ButtonVariant, string> = {
  pill: "h-(--layout-control-h) gap-2 rounded-full border border-glass bg-surface-button pr-3.5 pl-4 text-primary type-button-label",
  primary:
    "gap-2.5 rounded-full border-2 border-transparent bg-[#1f2226] px-[26px] py-3 text-ink-on-dark shadow-[0_6px_8px_rgba(31,33,38,0.22)] type-catalog-button",
  light:
    "h-[60px] gap-2 rounded-[14px] border-2 border-transparent bg-[#f2f3f5] px-6 text-[20px] leading-normal font-medium text-[#1f2226]",
  outline:
    "h-[46px] gap-2 rounded-full border border-ink px-6 text-ink type-catalog-action",
  graphite:
    "h-[46px] gap-2 rounded-full border border-surface-card-hover bg-linear-to-b from-[rgba(76,80,83,0.2)] to-[rgba(65,68,72,0.2)] px-6 text-primary shadow-[0_8px_10px_rgba(20,23,26,0.35)] type-catalog-action",
  save: "h-11 gap-2 rounded-full border border-ink pr-[18px] pl-4 text-ink type-catalog-action",
};

/* Icon sizes in Figma: 16 everywhere, except Graphite arrow 18 and Save heart 20 (Icon only knows 12/16/24). */
const ICON: Record<ButtonVariant, { size: IconSize; className?: string }> = {
  pill: { size: 16 },
  primary: { size: 16 },
  light: { size: 16 },
  outline: { size: 16 },
  graphite: { size: 16, className: "size-[18px]!" },
  save: { size: 24, className: "size-5!" },
};

/**
 * STONE button. Renders `<button>` (type "button" by default), or the locale-aware `Link` when
 * `href` is given. Hover, focus and pressed use the `hov:` / `focusv:` / `press:` variants, so the
 * `state` prop can freeze them via `data-state`. The press ripple is CSS only.
 */
export function Button(props: ButtonProps) {
  const t = useTranslations("components.button");
  const {
    variant = "pill",
    iconLeft,
    iconRight,
    disabled = false,
    inert = false,
    state,
    children,
    className,
  } = props;

  const loading = props.type === "submit" && props.loading === true;
  const left = iconLeft ?? (variant === "save" ? "heart" : undefined);
  const icon = ICON[variant];
  const classes = cn(BASE, VARIANT[variant], DISABLED, className);

  // A loading button stays focusable (aria-disabled, not `disabled`), so activation is blocked here:
  // preventDefault also stops the implicit form submit from Enter / Space / click.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    props.onClick?.();
  };

  const content = (
    <>
      {left ? <Icon name={left} {...icon} /> : null}
      <span className="min-w-0 truncate">{children}</span>
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
          <span className="sr-only">{t("loading")}</span>
        </>
      ) : iconRight ? (
        <Icon name={iconRight} {...icon} />
      ) : null}
    </>
  );

  if (inert && !disabled) {
    return (
      <span
        role={props.href !== undefined ? "link" : "button"}
        aria-disabled="true"
        data-state={state}
        className={cn(INERT_BASE, INERT[variant], className)}
      >
        {content}
      </span>
    );
  }

  if (props.href !== undefined) {
    // A disabled link is not a link at all: no <a>/href, so it cannot be activated by a screen
    // reader, a programmatic click or "open in new tab".
    if (disabled) {
      return (
        <span
          role="link"
          aria-disabled="true"
          data-state={state}
          className={classes}
        >
          {content}
        </span>
      );
    }
    return (
      <Link href={props.href} className={classes} data-state={state}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      className={classes}
      data-state={state}
      disabled={disabled}
      aria-disabled={loading ? "true" : undefined}
      aria-busy={loading ? "true" : undefined}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}
