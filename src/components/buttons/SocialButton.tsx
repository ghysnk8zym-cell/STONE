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
  /** Not built yet: default look, non-link, no reaction, no dim (Phase 3 footer). */
  inert?: boolean;
};

/*
 * Figma Social/Button 21:115: 44x44, fill surface/nav-pill, label Button/Label (Inter Medium 14/20)
 * in text/primary. The abbreviation is a placeholder for the official brand icons; the accessible
 * name is "{abbr}, {network}" from messages (`components.social.*`): the full network name the
 * component description asks for, led by the visible text so it satisfies WCAG 2.5.3 Label in
 * Name (voice control: "click TG"). When the official brand icons replace the text monograms,
 * drop `{abbr}` from `components.social.name` and keep the network name (the criterion then no
 * longer applies).
 */
export function SocialButton({
  label,
  href,
  state,
  disabled = false,
  inert = false,
}: SocialButtonProps) {
  const t = useTranslations("components.social");
  const name = t("name", { abbr: label, network: t(NETWORK[label]) });
  const classes = cn(
    ROUND_GLASS,
    "size-11 bg-surface-nav-pill text-primary type-button-label",
  );

  if (disabled || inert) {
    return (
      <span
        role="link"
        aria-label={name}
        aria-disabled="true"
        data-state={state}
        className={
          disabled
            ? classes
            : "border-glass bg-surface-nav-pill text-primary type-button-label inline-flex size-11 shrink-0 cursor-default items-center justify-center rounded-full border select-none"
        }
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
