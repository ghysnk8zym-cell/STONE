import { setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import { NotFoundView } from "../NotFoundView";

/*
 * Target of the middleware rewrite for unknown paths (src/lib/route-gate.ts); the middleware sets
 * status 404. A normal page render, so the localised 404 is in the server HTML (works without
 * JavaScript). Its <title> comes from ../not-found.tsx: Next takes 404 metadata from the boundary.
 * Dynamic on purpose: a prerendered copy would be served from the route cache with its stored
 * 200 status.
 */
export const dynamic = "force-dynamic";

export default async function NotFoundPage({
  params,
}: PageProps<"/[locale]/404">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <NotFoundView />;
}
