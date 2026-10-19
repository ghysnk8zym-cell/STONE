"use server";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  REQUEST_QUOTE_MAX_CENTS,
  STONE_REQUEST_STATUSES,
  type StoneRequestResult,
  type StoneRequestStatus,
} from "@/features/admin/stone-requests";
import { requireRole } from "@/server/auth/guards";
import { requestLocale } from "@/server/auth/request-locale";
import { getDb, schema } from "../db";
import { revisionSchema } from "./product-input";

const quoteSchema = z
  .object({
    id: z.uuid(),
    revision: revisionSchema,
    quoteUnitPriceCents: z.number().int().min(0).max(REQUEST_QUOTE_MAX_CENTS),
  })
  .strict();
const statusSchema = z
  .object({
    id: z.uuid(),
    revision: revisionSchema,
    status: z.enum(STONE_REQUEST_STATUSES),
  })
  .strict();
const saved = {
  revision: schema.stoneRequest.revision,
  status: schema.stoneRequest.status,
  quoteUnitPriceCents: schema.stoneRequest.quoteUnitPriceCents,
};

/** Saving a quote is a draft operation only: it never sends messages or starts payment. */
export async function saveStoneRequestQuote(
  input: unknown,
): Promise<StoneRequestResult> {
  await requireRole("admin", await requestLocale());
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  const { id, revision, quoteUnitPriceCents } = parsed.data;
  const [updated] = await db
    .update(schema.stoneRequest)
    .set({
      quoteUnitPriceCents,
      status: "draft_quote",
      revision: sql`${schema.stoneRequest.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.stoneRequest.id, id),
        eq(schema.stoneRequest.revision, revision),
      ),
    )
    .returning(saved);
  if (!updated) {
    const [exists] = await db
      .select({ id: schema.stoneRequest.id })
      .from(schema.stoneRequest)
      .where(eq(schema.stoneRequest.id, id));
    return { ok: false, code: exists ? "conflict" : "not-found" };
  }
  revalidatePath("/[locale]/admin", "layout");
  return {
    ok: true,
    snapshot: { ...updated, status: updated.status as StoneRequestStatus },
  };
}

/** Explicit tracking status; no proposal delivery or payment state is inferred. */
export async function setStoneRequestStatus(
  input: unknown,
): Promise<StoneRequestResult> {
  await requireRole("admin", await requestLocale());
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  const { id, revision, status } = parsed.data;
  const [updated] = await db
    .update(schema.stoneRequest)
    .set({
      status,
      revision: sql`${schema.stoneRequest.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.stoneRequest.id, id),
        eq(schema.stoneRequest.revision, revision),
        status === "new"
          ? undefined
          : isNotNull(schema.stoneRequest.quoteUnitPriceCents),
      ),
    )
    .returning(saved);
  if (!updated) {
    const [existing] = await db
      .select(saved)
      .from(schema.stoneRequest)
      .where(eq(schema.stoneRequest.id, id));
    return {
      ok: false,
      code: !existing
        ? "not-found"
        : existing.revision !== revision
          ? "conflict"
          : "quote-required",
    };
  }
  revalidatePath("/[locale]/admin", "layout");
  return {
    ok: true,
    snapshot: { ...updated, status: updated.status as StoneRequestStatus },
  };
}
