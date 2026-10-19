import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth/guards";
import { getDb, schema } from "../db";

export async function getRequestConfirmation(locale: string, id: string) {
  const user = await requireUser(locale);
  if (!z.uuid().safeParse(id).success) return null;
  const db = await getDb();
  if (!db) return null;
  const r = schema.stoneRequest;
  const [request] = await db
    .select({
      id: r.id,
      number: r.number,
      material: r.material,
      color: r.color,
      texture: r.finish,
      lengthMm: r.lengthMm,
      widthMm: r.widthMm,
      thicknessMm: r.thicknessMm,
      quantity: r.quantity,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactPhone: r.contactPhone,
    })
    .from(r)
    .where(
      and(
        eq(r.id, id),
        user.role === "admin" ? undefined : eq(r.userId, user.id),
      ),
    )
    .limit(1);
  return request?.contactName ? request : null;
}
