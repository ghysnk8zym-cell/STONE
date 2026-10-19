import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  STONE_REQUEST_STATUSES,
  type StoneRequestSnapshot,
  type StoneRequestStatus,
} from "@/features/admin/stone-requests";
import { requireRole } from "@/server/auth/guards";
import { getDb, schema } from "../db";
import { isCatalogImage } from "./images";

export type AdminStoneRequest = StoneRequestSnapshot & {
  id: string;
  number: string;
  name: string;
  customer: { id: string; name: string; email: string };
  material: string;
  color: string;
  finish: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  quantity: number;
  referenceImage: string | null;
  hasPhoto: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
};
export type AdminStoneRequests = {
  requests: AdminStoneRequest[];
  selected: AdminStoneRequest | null;
  q: string;
  status: StoneRequestStatus | "all";
  page: number;
  pages: number;
  total: number;
};
export type StoneRequestsSummary = {
  total: number;
  requests: AdminStoneRequest[];
};
const r = schema.stoneRequest;
const selection = {
  id: r.id,
  number: r.number,
  nameEn: r.nameEn,
  nameRu: r.nameRu,
  customer: {
    id: schema.user.id,
    name: schema.user.name,
    email: schema.user.email,
  },
  material: r.material,
  color: r.color,
  finish: r.finish,
  lengthMm: r.lengthMm,
  widthMm: r.widthMm,
  thicknessMm: r.thicknessMm,
  quantity: r.quantity,
  referenceImage: r.referenceImage,
  hasPhoto: sql<boolean>`${r.photoBase64} is not null`,
  contactName: r.contactName,
  contactEmail: r.contactEmail,
  contactPhone: r.contactPhone,
  quoteUnitPriceCents: r.quoteUnitPriceCents,
  status: r.status,
  revision: r.revision,
  createdAt: r.createdAt,
};
function toDto(
  row: {
    nameEn: string;
    nameRu: string;
    status: string;
    createdAt: Date;
  } & Omit<AdminStoneRequest, "name" | "status" | "createdAt">,
  locale: string,
): AdminStoneRequest {
  const { nameEn, nameRu, ...rest } = row;
  return {
    ...rest,
    name: locale === "ru" ? nameRu : nameEn,
    status: row.status as StoneRequestStatus,
    createdAt: row.createdAt.toISOString(),
    referenceImage:
      row.referenceImage && isCatalogImage(row.referenceImage)
        ? row.referenceImage
        : null,
  };
}

export async function getAdminStoneRequests(
  locale: string,
  query: { q?: string; status?: string; page?: number; request?: string } = {},
): Promise<AdminStoneRequests> {
  await requireRole("admin", locale);
  const db = await getDb();
  if (!db) throw new Error("admin queries need a database");
  const q = (query.q ?? "").trim().slice(0, 100);
  const status =
    STONE_REQUEST_STATUSES.find((value) => value === query.status) ?? "all";
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const filter = and(
    status === "all" ? undefined : eq(r.status, status),
    q
      ? or(
          ilike(r.number, pattern),
          ilike(locale === "ru" ? r.nameRu : r.nameEn, pattern),
          ilike(schema.user.name, pattern),
          ilike(schema.user.email, pattern),
        )
      : undefined,
  );
  const [counts] = await db
    .select({ total: count() })
    .from(r)
    .innerJoin(schema.user, eq(r.userId, schema.user.id))
    .where(filter);
  const total = counts?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 50));
  const page = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(query.page) ? query.page! : 1),
  );
  const rows = await db
    .select(selection)
    .from(r)
    .innerJoin(schema.user, eq(r.userId, schema.user.id))
    .where(filter)
    .orderBy(desc(r.createdAt), desc(r.number))
    .limit(50)
    .offset((page - 1) * 50);
  const requests = rows.map((row) => toDto(row, locale));
  let selected = requests.find((row) => row.id === query.request) ?? null;
  // Selection is independent of filters: a successful status save must not unmount an unsaved quote.
  if (!selected && z.uuid().safeParse(query.request).success) {
    const [row] = await db
      .select(selection)
      .from(r)
      .innerJoin(schema.user, eq(r.userId, schema.user.id))
      .where(eq(r.id, query.request!))
      .limit(1);
    if (row) selected = toDto(row, locale);
  }
  return {
    requests,
    selected: selected ?? requests[0] ?? null,
    q,
    status,
    page,
    pages,
    total,
  };
}

/** Separate latest-three query: a list filter/page must not change Overview totals. */
export async function getAdminStoneRequestsSummary(
  locale: string,
): Promise<StoneRequestsSummary> {
  await requireRole("admin", locale);
  const db = await getDb();
  if (!db) throw new Error("admin queries need a database");
  const [[counts], rows] = await Promise.all([
    db.select({ total: count() }).from(r),
    db
      .select(selection)
      .from(r)
      .innerJoin(schema.user, eq(r.userId, schema.user.id))
      .orderBy(desc(r.createdAt), desc(r.number))
      .limit(3),
  ]);
  return {
    total: counts?.total ?? 0,
    requests: rows.map((row) => toDto(row, locale)),
  };
}
