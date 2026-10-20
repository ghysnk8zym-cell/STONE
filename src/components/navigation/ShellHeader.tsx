"use client";
import { usePathname } from "@/i18n/navigation";
import { SiteHeader } from "./SiteHeader";
import { INERT } from "./nav-items";

export function ShellHeader() {
  const pathname = usePathname();
  return (
    <SiteHeader
      inert={INERT.nav}
      current={pathname === "/create-your-stone" ? "create" : undefined}
    />
  );
}
