import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import type { InteractionState } from "../buttons/Button";

export type SearchFieldProps = {
  name: string;
  placeholder: string;
  /** `light`: the field on the marble catalog page. `graphite`: the search panel that opens under the dark Search pill. */
  tone?: "light" | "graphite";
  /** Accessible name. Defaults to the placeholder, which is the only visible text of the field. */
  label?: string;
  defaultValue?: string;
  disabled?: boolean;
  /** Frozen look for the styleguide (`data-state`). */
  state?: Extract<InteractionState, "hover" | "focus">;
};

/*
 * Catalog search field (Catalog 1440 > Search 922:25500, 1440 and 390 are identical) and the
 * "Search panel" of Search/Pill Graphite Open (971:28941): 52 px high, 12 px radius, stone/catalog-card
 * fill, stone/catalog-line border, 24 px icon 16 px from the edge, 12 px gap, Catalog/Field value text
 * in stone/catalog-secondary. The panel under the Graphite pill adds a 0 8 24 rgba(0,0,0,.18) shadow.
 * Figma draws no hover / focus / disabled for it: hover = secondary border, focus = 2 px ink/primary
 * (same as Field/Select Focus 338:501), disabled = 45 % opacity.
 */
const FIELD = cn(
  "block h-13 w-full rounded-[12px] border border-stone-catalog-line bg-stone-catalog-card pr-4 pl-13 text-stone-catalog-ink outline-0 type-catalog-field-value motion-hover",
  "placeholder:text-stone-catalog-secondary",
  "hov:border-stone-catalog-secondary",
  "focusv:border-ink-primary focusv:outline-1 focusv:-outline-offset-1 focusv:outline-ink-primary",
  "disabled:pointer-events-none disabled:opacity-45",
  // The native clear button is not in Figma (Escape clears the field in browsers).
  "appearance-none [&::-webkit-search-cancel-button]:hidden",
);

const TONE = {
  light: "",
  graphite: "shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
} as const;

/** Search input (`type="search"`, implicit role searchbox). Server-compatible; the page owns the `<form role="search">`. */
export function SearchField({
  name,
  placeholder,
  tone = "light",
  label,
  defaultValue,
  disabled = false,
  state,
}: SearchFieldProps) {
  return (
    <div className="relative w-full">
      <Icon
        name="search"
        className={cn(
          "text-stone-catalog-ink pointer-events-none absolute top-1/2 left-[17px] -translate-y-1/2",
          disabled && "opacity-45",
        )}
      />
      <input
        type="search"
        name={name}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        defaultValue={defaultValue}
        disabled={disabled}
        data-state={state}
        className={cn(FIELD, TONE[tone])}
      />
    </div>
  );
}
