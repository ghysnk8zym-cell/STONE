"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  HOME_FIELDS,
  isHomeTextKey,
  type HomeTextResult,
} from "@/features/content/home-fields";
import { hasHiddenCharacters } from "@/lib/plain-text";
import { requireRole } from "../auth/guards";
import { requestLocale } from "../auth/request-locale";
import { getDb, schema } from "../db";

const localeSchema = z.enum(["ru", "en"]);
const expectedSchema = z.string().min(1).max(200).nullable();

/** One explicit field save. Null restores messages; no arbitrary paths or templates. */
export async function saveHomeText(
  locale: unknown,
  key: unknown,
  text: unknown,
  expected: unknown,
): Promise<HomeTextResult> {
  await requireRole("admin", await requestLocale());
  const language = localeSchema.safeParse(locale);
  const before = expectedSchema.safeParse(expected);
  if (
    !language.success ||
    typeof key !== "string" ||
    !isHomeTextKey(key) ||
    /^hero\.line[1-4]$/.test(key) ||
    !before.success
  )
    return { ok: false, code: "invalid" };
  const parsed = z
    .string()
    .trim()
    .min(1)
    .max(HOME_FIELDS[key].max)
    .refine((value) => !hasHiddenCharacters(value))
    .nullable()
    .safeParse(text);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  const target = and(
    eq(schema.siteContent.key, key),
    eq(schema.siteContent.locale, language.data),
  );
  if (parsed.data === null && before.data === null) {
    const existing = await db
      .select({ key: schema.siteContent.key })
      .from(schema.siteContent)
      .where(target)
      .limit(1);
    if (existing.length) return { ok: false, code: "conflict" };
  } else {
    const saved =
      before.data === null
        ? await db
            .insert(schema.siteContent)
            .values({ key, locale: language.data, text: parsed.data! })
            .onConflictDoNothing()
            .returning({ key: schema.siteContent.key })
        : parsed.data === null
          ? await db
              .delete(schema.siteContent)
              .where(and(target, eq(schema.siteContent.text, before.data)))
              .returning({ key: schema.siteContent.key })
          : await db
              .update(schema.siteContent)
              .set({ text: parsed.data })
              .where(and(target, eq(schema.siteContent.text, before.data)))
              .returning({ key: schema.siteContent.key });
    if (!saved.length) return { ok: false, code: "conflict" };
  }
  revalidatePath(`/${language.data}`);
  revalidatePath("/[locale]/admin/site-content", "page");
  return { ok: true, text: parsed.data };
}
