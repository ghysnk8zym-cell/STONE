import { cn } from "../cn";
import { Icon, type IconName } from "../icons/Icon";

/**
 * Account/Nav button 732:568: 46 px pill, 15/20 Inter Medium label. `cn()` is not twMerge, so the idle and the
 * selected look are two complete sets, never combined: idle = text/secondary with 10 px left padding; selected =
 * fill surface/selected, text/primary, 4 px more left padding (the label slides right, as the Figma component does).
 */
const NAV_BASE =
  "motion-hover focusv:outline-2 focusv:-outline-offset-2 focusv:outline-accent-focus flex h-[46px] w-full items-center gap-3 rounded-full pr-3.5 text-left outline-0 type-catalog-action";
export const NAV_IDLE = cn(
  NAV_BASE,
  "pl-2.5 text-secondary hov:bg-surface-button",
);
export const NAV_SELECTED = cn(
  NAV_BASE,
  "bg-surface-selected pl-3.5 text-primary",
);

export function NavIcon({ name }: { name: IconName }) {
  return <Icon name={name} />;
}

/** The indicator bar of Account/Nav button: 3 x 18, visible on the selected section only. */
export function NavIndicator({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary h-[18px] w-[3px] shrink-0 rounded-[2px]",
        !visible && "opacity-0",
      )}
    />
  );
}
