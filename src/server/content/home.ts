import "server-only";
import { eq } from "drizzle-orm";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import {
  HOME_TEXT_KEYS,
  isHomeTextKey,
  type HomeText,
} from "@/features/content/home-fields";
import type { Locale } from "@/i18n/routing";
import { getDb, schema } from "../db";

/** Public plain text, never HTML or an ICU template. Absent overrides use messages. */
export async function getHomeText(locale: Locale): Promise<HomeText> {
  const home = (locale === "en" ? en : ru).pages.home;
  const defaults = Object.fromEntries(
    HOME_TEXT_KEYS.map((key) => {
      let value: unknown = home;
      for (const part of key.split("."))
        value = (value as Record<string, unknown>)[part];
      return [key, value as string];
    }),
  ) as HomeText["defaults"];
  const stored = Object.fromEntries(
    HOME_TEXT_KEYS.map((key) => [key, null]),
  ) as HomeText["stored"];
  const values = { ...defaults };
  const db = await getDb();
  if (db) {
    const rows = await db
      .select({ key: schema.siteContent.key, text: schema.siteContent.text })
      .from(schema.siteContent)
      .where(eq(schema.siteContent.locale, locale));
    for (const row of rows)
      if (isHomeTextKey(row.key)) {
        stored[row.key] = row.text;
        values[row.key] = row.text;
      }
  }
  for (const key of ["line1", "line2", "line3", "line4"] as const) {
    defaults[`hero.${key}`] = en.pages.home.hero[key];
    values[`hero.${key}`] = en.pages.home.hero[key];
  }
  return { defaults, stored, values };
}
