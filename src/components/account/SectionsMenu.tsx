"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import { ACCOUNT_SECTIONS, sectionFor } from "./sections";

/*
 * "Account sections" (Figma Select / Account sections 737:6532, shown below 1024 instead of the sidebar):
 * a full-width 46 px pill with a 1 px text/ink border, the label Inter Medium 15 and the 16 px chevron.
 * Figma draws the closed state only; the open list reuses the dark glass dropdown of the catalog filters
 * (surface/footer, border/glass, blur 12, r16, 40 px rows) and lists the four sections and Sign out, the
 * entries of the sidebar. A disclosure button + a list of links (it navigates, so it is not a form select):
 * Escape and a click outside close it, choosing a link closes it.
 */
export function SectionsMenu() {
  const t = useTranslations("account.nav");
  const current = sectionFor(usePathname());
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const separator = ", ";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const row =
    "type-button-label text-primary hov:bg-surface-card-hover focusv:outline-2 focusv:-outline-offset-2 focusv:outline-accent-focus flex min-h-10 items-center rounded-[10px] px-3 py-2 outline-0";

  return (
    <div ref={root} className="relative lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="type-catalog-action text-ink border-ink hov:bg-overlay-tint-10 focusv:outline-2 focusv:outline-offset-2 focusv:outline-accent-focus motion-hover flex h-[46px] w-full cursor-pointer items-center justify-between rounded-full border pr-4 pl-5 text-left outline-0"
      >
        {/* Figma draws the generic label on all four screens, so the sighted label stays; the current section is added for screen readers. */}
        <span>
          {t("label")}
          {current ? (
            <span className="sr-only">{separator + t(current)}</span>
          ) : null}
        </span>
        <Icon
          name="chevron"
          size={16}
          className={cn("motion-hover", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul
          id={listId}
          className="border-glass bg-surface-footer absolute inset-x-0 top-full z-20 mt-1 flex list-none flex-col gap-0.5 rounded-2xl border p-2 backdrop-blur-[12px]"
        >
          {ACCOUNT_SECTIONS.map(({ key, href }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={current === key ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(row, current === key && "bg-surface-selected")}
              >
                {t(key)}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/sign-out"
              onClick={() => setOpen(false)}
              className={row}
            >
              {t("signOut")}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
