import "server-only";
import { and, eq, sql } from "drizzle-orm";
import {
  DEMO_TOTAL_REQUESTS,
  DEMO_USER_REQUESTS,
  type RequestInput,
} from "@/features/stone-requests/input";
import { type Db, schema } from "../db";

/** Drizzle's three supported Postgres drivers expose raw rows in this shape. */
function rows<T>(result: unknown): T[] {
  return Array.isArray(result) ? result : (result as { rows: T[] }).rows;
}

export async function consumeAttempt(db: Db, owner: string): Promise<boolean> {
  const key = `stone-upload:${owner}`;
  const now = Date.now();
  const result = await db.execute(sql`
    INSERT INTO rate_limit (id, key, count, last_request) VALUES (${key}, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit.last_request < ${now - 60_000} THEN 1 ELSE LEAST(rate_limit.count + 1, 11) END,
      last_request = CASE WHEN rate_limit.last_request < ${now - 60_000} THEN ${now} ELSE rate_limit.last_request END
    RETURNING count`);
  return rows<{ count: number }>(result)[0].count <= 10;
}

export async function findSubmission(db: Db, owner: string, key: string) {
  const r = schema.stoneRequest;
  const [existing] = await db
    .select({ id: r.id, number: r.number, digest: r.submissionDigest })
    .from(r)
    .where(and(eq(r.userId, owner), eq(r.submissionKey, key)))
    .limit(1);
  return existing ?? null;
}

/** A single statement: the locked budget update and request/photo insert commit or roll back together. */
export async function insertSubmission(
  db: Db,
  owner: string,
  key: string,
  digest: string,
  photo: Buffer,
  input: RequestInput,
  names: { en: string; ru: string },
) {
  const result = await db.execute(sql`
    WITH capacity AS (
      UPDATE stone_request_budget SET total = total + 1,
        users = jsonb_set(users, ARRAY[${owner}]::text[], to_jsonb(COALESCE((users ->> ${owner})::integer, 0) + 1))
      WHERE id = 1 AND total < ${DEMO_TOTAL_REQUESTS} AND COALESCE((users ->> ${owner})::integer, 0) < ${DEMO_USER_REQUESTS}
      RETURNING id
    )
    INSERT INTO stone_request (user_id, name_en, name_ru, material, color, finish, length_mm, width_mm, thickness_mm, quantity, photo_base64, submission_key, submission_digest, contact_name, contact_email, contact_phone)
    SELECT ${owner}, ${names.en}, ${names.ru}, ${input.material}, ${input.color}, ${input.texture}, ${input.lengthMm}, ${input.widthMm}, ${input.thicknessMm}, ${input.quantity}, ${photo.toString("base64")}, ${key}::uuid, ${digest}, ${input.contactName}, ${input.contactEmail}, ${input.contactPhone}
    FROM capacity RETURNING id, number`);
  return rows<{ id: string; number: string }>(result)[0] ?? null;
}
