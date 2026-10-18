import type { IconName } from "../icons/Icon";

/**
 * The eight sections of the admin area, in sidebar order (Figma Admin/Sidebar 1060:52244). `href` is
 * locale-free (the Link adds the locale). The last four are filled in Phase 4b; until then their pages
 * show the Figma header and a "next update" card.
 */
export const ADMIN_SECTIONS = [
  { key: "overview", href: "/admin", icon: "home" },
  { key: "orders", href: "/admin/orders", icon: "orders" },
  { key: "products", href: "/admin/products", icon: "box" },
  { key: "createYourStone", href: "/admin/create-your-stone", icon: "diamond" },
  { key: "customers", href: "/admin/customers", icon: "users" },
  { key: "promotions", href: "/admin/promotions", icon: "tag" },
  // Figma draws the document icon here too (the same glyph as Orders).
  { key: "siteContent", href: "/admin/site-content", icon: "orders" },
] as const satisfies readonly {
  key: string;
  href: string;
  icon: IconName;
}[];

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

/** The section for a locale-stripped pathname (`/admin/products/new` is Products), or undefined. */
export function adminSectionFor(pathname: string): AdminSection | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/admin") return "overview";
  return ADMIN_SECTIONS.find(
    ({ href }) => href !== "/admin" && path.startsWith(href),
  )?.key;
}
