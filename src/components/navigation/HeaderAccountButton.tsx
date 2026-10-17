"use client";

import { useTranslations } from "next-intl";

import { useAccountHref } from "@/features/account/account-context";

import { IconButton } from "../buttons/IconButton";
import type { NavCurrent } from "./nav-items";

/**
 * The account button of the full header (Figma "Header/Full + Account" 732:539, Nav / Account 742:7328;
 * Icon/User). Session-aware: a Guest goes to /sign-in, a signed-in visitor to /account. A client component
 * because the public pages are static and the visitor state arrives after hydration
 * (src/features/account/AccountStateProvider.tsx); SiteHeader itself stays a server component.
 */
export function HeaderAccountButton({
  current,
  inert = false,
}: {
  current?: NavCurrent;
  inert?: boolean;
}) {
  const t = useTranslations("components.nav");
  const href = useAccountHref();
  return (
    <IconButton
      icon="user"
      label={t("account")}
      href={href}
      current={current === "account"}
      inert={inert}
    />
  );
}
