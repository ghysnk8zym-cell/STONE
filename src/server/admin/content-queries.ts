import "server-only";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "../auth/guards";
import { getHomeText } from "../content/home";

export async function getHomeTextEditor(locale: Locale) {
  await requireRole("admin", locale);
  return getHomeText(locale);
}
