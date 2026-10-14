import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";
import type { InteractionState } from "./Button";
import { ROUND_GLASS } from "./round-glass";

const NETWORK = { TG: "tg", VK: "vk", IG: "ig", WA: "wa" } as const;

export type SocialButtonProps = {
  /** Brand abbreviation shown as text (Figma monogram placeholder, not translated). */
  label: keyof typeof NETWORK;
  href: string;
  /** Frozen interaction state, rendered as `data-state` (styleguide only). */
  state?: InteractionState;
  /** Figma Disabled variant: renders a non-link `<span role="link" aria-disabled>` without href. */
  disabled?: boolean;
};

/*
 * Figma Social/Button 21:115: 44x44, fill surface/nav-pill, label Button/Label (Inter Medium 14/20)
 * in text/primary. The abbreviation is a placeholder for the official brand icons; the accessible
 * name is the full network name from messages (`components.social.*`), as the component
 * description asks.
 */
export function SocialButton({
  label,
  href,
  state,
  disabled = false,
}: SocialButtonProps) {
  const t = useTranslations("components.social");
  const name = t(NETWORK[label]);
  const classes = cn(
    ROUND_GLASS,
    "size-11 bg-surface-nav-pill text-primary type-button-label",
  );

  if (disabled) {
    return (
      <span
        role="link"
        aria-label={name}
        aria-disabled="true"
        data-state={state}
        className={classes}
      >
        {label}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={name} data-state={state} className={classes}>
      {label}
    </Link>
  );
}
