import { useId } from "react";

import { cn } from "../cn";

export type TextFieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number";
  /** `dark`: Input/Dark 430:504 on photographic screens. `light`: Product/Field 779:541 on the marble catalog page. */
  tone?: "dark" | "light";
  /** Error message. Sets `aria-invalid` and is announced (role alert) and linked with `aria-describedby`. */
  error?: string;
  defaultValue?: string;
  /** Controlled value (the cost calculator); use instead of `defaultValue`. */
  value?: string;
  onChange?: (value: string) => void;
  /** Soft-keyboard hint; `type="number"` implies "decimal". */
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  /** Suffix cell (Product/Field "m²"). Read as part of the field description. */
  unit?: string;
  /** Frozen look for the styleguide (`data-state`). */
  state?: "focus";
};

/*
 * Colours / sizes per tone. Figma binds variables only on the light tone (stone/catalog-*); Input/Dark
 * 430:504 is all raw values (rgba fills, #a3a6ab placeholder, 18 px text), so those stay arbitrary.
 * Focus: Figma Input/Dark Focus draws a 2 px border at 90 % white; the 1 px border is recoloured and a
 * 1 px inset outline adds the second pixel, so the box never changes size. The light field has no
 * Focus in Figma: it takes the 2 px ink/primary border of Field/Select Focus. The ring is drawn on the
 * box (it wraps the unit cell too) and shows on keyboard focus only (`:focus-visible` on the input).
 *
 * `cn()` is not twMerge, so two border-colour classes on one element would be decided by CSS order.
 * Each state therefore selects ONE set: `ok` (rest / hover / focus colours) or `err`. In the error
 * state the border AND the focus ring stay red on hover and focus (no switch back to the base
 * colour). Class names are written out in full so Tailwind can see them.
 */
const TONES = {
  dark: {
    label: "text-label type-catalog-meta",
    shape: "h-15 rounded-[14px] border bg-[rgba(255,255,255,0.06)]",
    ok: cn(
      "border-[rgba(255,255,255,0.4)]",
      "hov:border-[rgba(255,255,255,0.6)]",
      "focusv:border-[rgba(255,255,255,0.9)] focusv:outline-1 focusv:-outline-offset-2 focusv:outline-[rgba(255,255,255,0.9)]",
      "has-[input:focus-visible]:border-[rgba(255,255,255,0.9)] has-[input:focus-visible]:outline-1 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-[rgba(255,255,255,0.9)]",
    ),
    err: cn(
      "border-[#f0a8a0]",
      "hov:border-[#f0a8a0]",
      "focusv:border-[#f0a8a0] focusv:outline-1 focusv:-outline-offset-1 focusv:outline-[#f0a8a0]",
      "has-[input:focus-visible]:border-[#f0a8a0] has-[input:focus-visible]:outline-1 has-[input:focus-visible]:-outline-offset-1 has-[input:focus-visible]:outline-[#f0a8a0]",
    ),
    input: "pr-6 pl-6 text-[18px] text-primary placeholder:text-[#a3a6ab]",
    unit: "border-glass text-secondary type-catalog-meta",
    error: "text-[#f0a8a0]",
  },
  light: {
    label: "text-stone-catalog-ink type-catalog-meta",
    shape: "h-13 rounded-[12px] border bg-stone-catalog-page",
    ok: cn(
      "border-stone-catalog-line",
      "hov:border-stone-catalog-secondary",
      "focusv:border-ink-primary focusv:outline-1 focusv:-outline-offset-1 focusv:outline-ink-primary",
      "has-[input:focus-visible]:border-ink-primary has-[input:focus-visible]:outline-1 has-[input:focus-visible]:-outline-offset-1 has-[input:focus-visible]:outline-ink-primary",
    ),
    err: cn(
      "border-[#a3362d]",
      "hov:border-[#a3362d]",
      "focusv:border-[#a3362d] focusv:outline-1 focusv:-outline-offset-1 focusv:outline-[#a3362d]",
      "has-[input:focus-visible]:border-[#a3362d] has-[input:focus-visible]:outline-1 has-[input:focus-visible]:-outline-offset-1 has-[input:focus-visible]:outline-[#a3362d]",
    ),
    input:
      "pr-3 pl-4 text-stone-catalog-ink type-catalog-field-value placeholder:text-stone-catalog-secondary",
    unit: "border-stone-catalog-line text-stone-catalog-secondary type-catalog-meta",
    error: "text-[#a3362d]",
  },
} as const;

/**
 * Labelled text input. The visible `<label>` is bound with `htmlFor`; the error (if any) and the unit
 * are listed in `aria-describedby`. Server-compatible (ids from `useId`). Figma has no error or
 * disabled state: error = red border + message below, disabled = 45 % opacity (see the Task 6 report).
 */
export function TextField({
  label,
  name,
  type = "text",
  tone = "dark",
  error,
  defaultValue,
  value,
  onChange,
  inputMode,
  placeholder,
  required,
  autoComplete,
  disabled = false,
  unit,
  state,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const unitId = `${id}-unit`;
  const styles = TONES[tone];
  const describedBy =
    [error ? errorId : null, unit ? unitId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div
        data-state={state}
        className={cn(
          "motion-hover flex w-full items-center overflow-clip outline-0 has-[input:disabled]:opacity-45",
          styles.shape,
          error ? styles.err : styles.ok,
        )}
      >
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={
            onChange ? (event) => onChange(event.target.value) : undefined
          }
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent outline-0 disabled:cursor-not-allowed",
            styles.input,
          )}
        />
        {unit ? (
          <span
            id={unitId}
            className={cn(
              "flex h-full shrink-0 items-center border-l px-4 whitespace-nowrap",
              styles.unit,
            )}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className={cn("type-catalog-meta", styles.error)}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
