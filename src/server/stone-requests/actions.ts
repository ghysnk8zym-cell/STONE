"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  PHOTO_MAX_BYTES,
  requestInput,
  type SubmitRequestResult,
} from "@/features/stone-requests/input";
import { requireUser } from "@/server/auth/guards";
import { requestLocale } from "@/server/auth/request-locale";
import { getDb } from "../db";
import { sameOrigin } from "../same-origin";
import { canonicalPhoto } from "./photo";
import { consumeAttempt, findSubmission, insertSubmission } from "./store";

const names = {
  marble: { en: "Marble", ru: "Мрамор" },
  limestone: { en: "Limestone", ru: "Известняк" },
  slate: { en: "Slate", ru: "Сланец" },
  sandstone: { en: "Sandstone", ru: "Песчаник" },
  quartzite: { en: "Quartzite", ru: "Кварцит" },
  concrete: { en: "Concrete", ru: "Бетон" },
};
export async function submitStoneRequest(
  form: FormData,
): Promise<SubmitRequestResult> {
  const user = await requireUser(await requestLocale());
  if (!(await sameOrigin())) return { ok: false, code: "invalid" };
  if (!(form instanceof FormData)) return { ok: false, code: "invalid" };
  const key = z.uuid().safeParse(form.get("key"));
  const fields = form.get("fields");
  const file = form.get("photo");
  if (!key.success || typeof fields !== "string" || fields.length > 4096)
    return { ok: false, code: "invalid" };
  let parsed;
  try {
    parsed = requestInput.safeParse(JSON.parse(fields));
  } catch {
    return { ok: false, code: "invalid" };
  }
  if (!parsed.success) return { ok: false, code: "invalid" };
  if (
    !(file instanceof File) ||
    file.type !== "image/png" ||
    file.size === 0 ||
    file.size > PHOTO_MAX_BYTES
  )
    return { ok: false, code: "photo" };
  try {
    const db = await getDb();
    if (!db) return { ok: false, code: "unavailable" };
    if (!(await consumeAttempt(db, user.id)))
      return { ok: false, code: "rate-limit" };
    let photo: Buffer;
    try {
      photo = await canonicalPhoto(Buffer.from(await file.arrayBuffer()));
    } catch {
      return { ok: false, code: "photo" };
    }
    const digest = createHash("sha256")
      .update(JSON.stringify(parsed.data))
      .update(photo)
      .digest("hex");
    const existing = await findSubmission(db, user.id, key.data);
    if (existing)
      return existing.digest === digest
        ? { ok: true, id: existing.id, number: existing.number }
        : { ok: false, code: "conflict" };
    try {
      const saved = await insertSubmission(
        db,
        user.id,
        key.data,
        digest,
        photo,
        parsed.data,
        names[parsed.data.material],
      );
      if (!saved) {
        // The identical concurrent submission may have consumed the final slot.
        const won = await findSubmission(db, user.id, key.data);
        if (won)
          return won.digest === digest
            ? { ok: true, id: won.id, number: won.number }
            : { ok: false, code: "conflict" };
        return { ok: false, code: "quota" };
      }
      revalidatePath("/[locale]/admin", "layout");
      return { ok: true, ...saved };
    } catch {
      // A concurrent repeat can win after the first lookup. Its UNIQUE failure rolls back the budget.
      const won = await findSubmission(db, user.id, key.data);
      if (won)
        return won.digest === digest
          ? { ok: true, id: won.id, number: won.number }
          : { ok: false, code: "conflict" };
      return { ok: false, code: "unavailable" };
    }
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

/** Recover a submitted tab after an interrupted response, without storing contact details in the browser. */
export async function recoverStoneRequest(
  key: string,
): Promise<SubmitRequestResult | null> {
  const user = await requireUser(await requestLocale());
  if (!z.uuid().safeParse(key).success) return { ok: false, code: "invalid" };
  try {
    const db = await getDb();
    if (!db) return { ok: false, code: "unavailable" };
    const saved = await findSubmission(db, user.id, key);
    return saved ? { ok: true, id: saved.id, number: saved.number } : null;
  } catch {
    return { ok: false, code: "unavailable" };
  }
}
