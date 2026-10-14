"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  disabled?: boolean;
  /** Called with the new value when the user picks an option. */
  onChange?: (value: string) => void;
  /** Frozen look for the styleguide: `hover` / `focus` set `data-state`, `open` renders the list open. */
  state?: "hover" | "open" | "focus";
};

/*
 * Catalog filter select. Trigger: the Field of the Catalog screens (Field / Material 922:25505, 52 px
 * box, r12, stone/catalog-card fill, stone/catalog-line border, Catalog/Field value text, 16 px chevron,
 * label above in Catalog refined/Meta). The Components-page master Field/Select 338:507 is stale (white
 * glass pill on a dark page) and is used only for its states: Hover = glass-card shadow, Focus / Open =
 * 2 px ink/primary border, Open = chevron turned 180 degrees.
 * List: the dark glass dropdown of the screens (Dropdown / Material 922:25545): surface/footer fill,
 * border/glass, blur 12, r16, 8 px padding, 2 px gap, uppercase section-label head, 40 px rows, r10,
 * Button/Label text. It opens over the field (2 px above the box), as in Figma. Row hover / active and
 * the selected check are not drawn on the dark list (the Option/Row 346:477 master is the stale light
 * version): hover / active = surface/card-hover, selected = Option/Row check.
 */
const TRIGGER = cn(
  "group flex h-13 w-full cursor-pointer items-center gap-2 rounded-[12px] border border-stone-catalog-line bg-stone-catalog-card pr-3 pl-4 text-left text-stone-catalog-ink outline-0 type-catalog-field-value motion-hover",
  "hov:border-stone-catalog-secondary hov:shadow-(--effect-glass-card-shadow)",
  "focusv:border-ink-primary focusv:outline-1 focusv:-outline-offset-1 focusv:outline-ink-primary",
  "aria-expanded:border-ink-primary aria-expanded:outline-1 aria-expanded:-outline-offset-1 aria-expanded:outline-ink-primary",
  "disabled:pointer-events-none disabled:opacity-45",
);

const PANEL =
  "absolute -top-0.5 z-20 flex max-h-[min(24rem,calc(100dvh-2rem))] w-max max-w-[min(24rem,calc(100vw-2rem))] min-w-[max(100%,220px)] flex-col gap-0.5 rounded-2xl border border-glass bg-surface-footer p-2 backdrop-blur-[12px]";

const OPTION =
  "flex min-h-10 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-primary type-button-label data-[active=true]:bg-surface-card-hover";

/**
 * Listbox select (client component). A `<button aria-haspopup="listbox">` opens a `role="listbox"`
 * of `role="option"` rows; the value is mirrored in a hidden `<input name>` so it posts with forms.
 *
 * Focus model: aria-activedescendant. Opening by the user moves focus to the listbox, which keeps
 * focus while `aria-activedescendant` points at the active row; arrows / Home / End move it, Enter or
 * Space picks, Escape closes, Tab closes and moves on. Closing returns focus to the button.
 */
export function Select({
  label,
  name,
  options,
  defaultValue,
  disabled = false,
  onChange,
  state,
}: SelectProps) {
  const t = useTranslations("components.select");
  const id = useId();
  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusListOnOpen = useRef(false);

  const empty = options.length === 0;
  const inert = disabled || empty;

  const [value, setValue] = useState(defaultValue);
  // The shown / posted option is derived, so an unknown defaultValue (or changed options) falls back to the first option.
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  const [open, setOpen] = useState(state === "open" && !inert);
  const [active, setActive] = useState(selectedIndex);
  const [alignEnd, setAlignEnd] = useState(false);

  const openList = () => {
    if (inert) return;
    focusListOnOpen.current = true;
    setActive(selectedIndex);
    setAlignEnd(false);
    setOpen(true);
  };

  const closeList = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    setValue(option.value);
    if (option.value !== selected?.value) onChange?.(option.value);
    closeList();
  };

  // Keyboard open: focus the listbox once it exists. A list that starts open (styleguide) keeps focus where it is.
  useEffect(() => {
    if (open && focusListOnOpen.current) listRef.current?.focus();
    if (!open) focusListOnOpen.current = false;
  }, [open]);

  // Keep the panel inside the viewport: a right-column field opens to the left.
  useLayoutEffect(() => {
    if (!open) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect && rect.right > window.innerWidth) setAlignEnd(true);
  }, [open]);

  // Close on a press outside the select.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      closeList();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Scroll the active row into view (not implemented in jsdom).
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-option-${active}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, id]);

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      // preventDefault also stops the native click that Enter / Space would send.
      event.preventDefault();
      if (!open) openList();
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(active);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeList();
        break;
      case "Tab":
        // No preventDefault: focus moves on from the button.
        closeList();
        break;
    }
  };

  return (
    <div ref={rootRef} className="flex w-full flex-col gap-2">
      <span id={labelId} className="text-stone-catalog-ink type-catalog-meta">
        {label}
      </span>
      <div className="relative">
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          className={TRIGGER}
          disabled={inert}
          data-state={state === "open" ? undefined : state}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${labelId} ${buttonId}`}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onButtonKeyDown}
          // Firefox sends the Space click on key release; the keydown already acted.
          onKeyUp={(event) => {
            if (event.key === " ") event.preventDefault();
          }}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              empty && "text-stone-catalog-secondary",
            )}
          >
            {selected ? selected.label : t("empty")}
          </span>
          <Icon
            name="chevron"
            size={16}
            className="transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </button>
        <input
          type="hidden"
          name={name}
          value={selected?.value ?? ""}
          disabled={disabled}
        />
        {open ? (
          <div
            ref={panelRef}
            className={cn(PANEL, alignEnd ? "right-0" : "left-0")}
          >
            <div
              aria-hidden="true"
              className="text-label type-section-label px-3 pt-2 pb-1.5 uppercase"
            >
              {label}
            </div>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={labelId}
              aria-activedescendant={optionId(active)}
              className="m-0 flex min-h-0 list-none flex-col gap-0.5 overflow-y-auto p-0 outline-0"
              onKeyDown={onListKeyDown}
            >
              {options.map((option, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <li
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    data-active={index === active}
                    className={OPTION}
                    // Keep focus in the listbox while pressing a row.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => setActive(index)}
                    onClick={() => commit(index)}
                  >
                    <span className="min-w-0 flex-1 break-words">
                      {option.label}
                    </span>
                    {isSelected ? (
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        <Icon name="check" size={12} />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
