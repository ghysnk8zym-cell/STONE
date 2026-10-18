"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useAccountHref } from "@/features/account/account-context";
import { Link } from "@/i18n/navigation";

import { IconButton } from "../buttons/IconButton";
import { cn } from "../cn";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";
import { NAV_ITEMS, type NavCurrent } from "./nav-items";

export type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Page the user is on: that entry gets `aria-current="page"`. */
  current?: NavCurrent;
  /** Entries whose page does not exist yet: shown as non-link items with `aria-disabled`. */
  inert?: readonly NavCurrent[];
};

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/*
 * The Figma file draws no mobile menu panel: only the Menu / Close variants of the Icon button
 * (21:125) and the "Nav/Menu" text style (Lusitana 28/36). This panel is built from existing
 * tokens only (page surface, glass border, the header row of the 390 header, Nav/Menu entries)
 * and is shown in the styleguide approval block. Entries are the header entries; the language
 * switch sits at the bottom because the compact header has no room for it.
 */

/**
 * Full-screen modal dialog opened by the header menu button.
 * - `role="dialog"` + `aria-modal="true"`, named by `components.nav.menu`.
 * - Focus moves to the dialog on open, Tab / Shift+Tab cycle inside it, Escape closes it, and
 *   focus returns to the element that was focused when it opened.
 * - Everything else on the page is made `inert` (and the dialog is portalled to <body> so it
 *   is a direct child that stays out of that set), and page scrolling is locked.
 * - Choosing a link or the language closes it.
 */
export function MobileMenu({
  open,
  onClose,
  current,
  inert = [],
}: MobileMenuProps) {
  const t = useTranslations("components.nav");
  const accountHref = useAccountHref();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement as HTMLElement | null;

    // Page behind the dialog: not focusable, not clickable, not in the accessibility tree.
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (
        child === dialog ||
        !(child instanceof HTMLElement) ||
        child.tagName === "SCRIPT" ||
        child.hasAttribute("inert")
      ) {
        continue;
      }
      child.setAttribute("inert", "");
      inerted.push(child);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    dialog.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusableIn(dialog);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      for (const child of inerted) child.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("menu")}
      tabIndex={-1}
      className="bg-surface-page fixed inset-0 z-50 flex flex-col overflow-y-auto outline-0"
    >
      <div className="border-glass flex h-[72px] shrink-0 items-center justify-between border-b px-(--layout-header-pad-x)">
        <Logo onClick={onClose} />
        <IconButton icon="close" label={t("closeMenu")} onClick={onClose} />
      </div>
      <nav
        aria-label={t("primary")}
        className="flex-1 px-(--layout-header-pad-x) py-4"
      >
        <ul className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <li key={item.key} className="border-glass border-b">
              {inert.includes(item.key) ? (
                <span
                  role="link"
                  aria-disabled="true"
                  className="text-primary type-nav-menu block cursor-default py-4"
                >
                  {t(item.label)}
                </span>
              ) : (
                <Link
                  href={item.key === "account" ? accountHref : item.href}
                  onClick={onClose}
                  aria-current={current === item.key ? "page" : undefined}
                  className={cn(
                    "text-primary type-nav-menu focusv:outline-2 focusv:-outline-offset-2 focusv:outline-accent-focus block py-4 outline-0",
                    current === item.key &&
                      "underline decoration-1 underline-offset-8",
                  )}
                >
                  {t(item.label)}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="shrink-0 px-(--layout-header-pad-x) pb-6">
        <LanguageSwitch onSwitch={onClose} />
      </div>
    </div>,
    document.body,
  );
}
