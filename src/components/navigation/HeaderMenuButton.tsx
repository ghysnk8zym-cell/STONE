"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { IconButton } from "../buttons/IconButton";
import { MobileMenu } from "./MobileMenu";
import type { NavCurrent } from "./nav-items";

/** Same breakpoint as the header layout switch (Tailwind `xl`). */
const DESKTOP_QUERY = "(min-width: 1280px)";

/**
 * Menu button of the compact header and the owner of the MobileMenu open state, so SiteHeader
 * itself stays a server component. Visible below 1280 px only; the menu closes if the viewport
 * grows past that while it is open.
 */
export function HeaderMenuButton({ current }: { current?: NavCurrent }) {
  const t = useTranslations("components.nav");
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const close = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);

  return (
    <span ref={wrapper} className="contents xl:hidden">
      <IconButton
        icon="menu"
        label={t("openMenu")}
        expanded={open}
        haspopup="dialog"
        onClick={() => {
          // Safari does not focus a button on click; focus it so the menu can return focus here.
          wrapper.current?.querySelector("button")?.focus();
          setOpen(true);
        }}
      />
      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        current={current}
      />
    </span>
  );
}
