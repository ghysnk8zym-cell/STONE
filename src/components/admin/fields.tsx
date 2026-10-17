import { useId, type ReactNode } from "react";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";

/*
 * Admin/Field (Figma 1060:649): label Inter 14/20 in stone/catalog-secondary, an 8 px gap, then the box:
 * 48 px high, stone/catalog-card fill, 1 px stone/catalog-line, r12, 14 px side padding, 16/22 value in
 * stone/catalog-ink, an optional unit cell at the right and a chevron on selects. The Figma field has no
 * hover / focus / error frames; they follow the other light field of the site (Product/Field): the border
 * darkens on hover, the focus ring is the 2 px ink/primary border, an error draws the border red-brown
 * (no token: the colour of the account form errors).
 */

const BOX =
  "motion-hover flex h-12 w-full items-center gap-2.5 rounded-[12px] border bg-stone-catalog-card px-3.5 type-catalog-field-value text-stone-catalog-ink";
const BOX_OK =
  "border-stone-catalog-line hov:border-stone-catalog-secondary has-[:focus-visible]:border-ink-primary has-[:focus-visible]:outline-1 has-[:focus-visible]:-outline-offset-1 has-[:focus-visible]:outline-ink-primary";
const BOX_ERR =
  "border-[#9b3d33] has-[:focus-visible]:outline-1 has-[:focus-visible]:-outline-offset-1 has-[:focus-visible]:outline-[#9b3d33]";
const CONTROL =
  "min-w-0 flex-1 appearance-none bg-transparent outline-0 placeholder:text-stone-catalog-secondary";

type Shared = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
};

function Wrapper({
  label,
  id,
  error,
  hint,
  className,
  hideLabel,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  className?: string;
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className={cn(
          "type-catalog-meta text-stone-catalog-secondary",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p
          id={`${id}-hint`}
          className="type-footer-small text-stone-catalog-secondary"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="type-footer-small text-[#9b3d33]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function AdminInput({
  label,
  name,
  error,
  hint,
  className,
  unit,
  value,
  onChange,
  inputMode,
  maxLength,
  required,
  placeholder,
  prefix,
}: Shared & {
  unit?: string;
  prefix?: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "numeric" | "text";
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Wrapper
      label={label}
      id={id}
      error={error}
      hint={hint}
      className={className}
    >
      <div className={cn(BOX, error ? BOX_ERR : BOX_OK)}>
        {prefix && (
          <span className="text-stone-catalog-secondary">{prefix}</span>
        )}
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          inputMode={inputMode}
          maxLength={maxLength}
          required={required}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={(event) => onChange(event.target.value)}
          className={CONTROL}
        />
        {unit && (
          <span className="type-catalog-meta text-stone-catalog-secondary">
            {unit}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

/** The search box of a list (Admin/Field with the leading search icon). Uncontrolled: it lives in a GET form. */
export function AdminSearch({
  label,
  name,
  defaultValue,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  className?: string;
}) {
  const id = useId();
  return (
    <Wrapper label={label} id={id} className={className} hideLabel>
      <div className={cn(BOX, BOX_OK)}>
        <Icon
          name="search"
          size={16}
          className="text-stone-catalog-secondary size-5!"
        />
        <input
          id={id}
          name={name}
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={100}
          className={cn(CONTROL, "[&::-webkit-search-cancel-button]:hidden")}
        />
      </div>
    </Wrapper>
  );
}

export function AdminTextarea({
  label,
  name,
  error,
  hint,
  className,
  value,
  onChange,
  maxLength,
}: Shared & {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Wrapper
      label={label}
      id={id}
      error={error}
      hint={hint}
      className={className}
    >
      <div
        className={cn(BOX, "h-auto items-start py-3", error ? BOX_ERR : BOX_OK)}
      >
        <textarea
          id={id}
          name={name}
          rows={3}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={(event) => onChange(event.target.value)}
          className={cn(CONTROL, "resize-y")}
        />
      </div>
    </Wrapper>
  );
}

export function AdminSelect({
  label,
  name,
  error,
  hint,
  className,
  value,
  onChange,
  options,
  hideLabel,
}: Shared & {
  value: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  /** The label stays for assistive technology only (filters in a toolbar). */
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <Wrapper
      label={label}
      id={id}
      error={error}
      hint={hint}
      className={className}
      hideLabel={hideLabel}
    >
      <div className={cn(BOX, "relative", error ? BOX_ERR : BOX_OK)}>
        <select
          id={id}
          name={name}
          value={onChange ? value : undefined}
          defaultValue={onChange ? undefined : value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={
            onChange ? (event) => onChange(event.target.value) : undefined
          }
          className={cn(CONTROL, "cursor-pointer pr-6")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron"
          size={16}
          className="text-stone-catalog-ink pointer-events-none absolute right-3.5"
        />
      </div>
    </Wrapper>
  );
}
