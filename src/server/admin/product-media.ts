import "server-only";
import { inArray } from "drizzle-orm";
import { parseProductMedia, productMediaSource } from "@/lib/product-media";
import { schema, type Db } from "../db";

/** A shaped URL alone is insufficient: every upload must exist in the media registry. */
export async function validProductMedia(db: Db, sources: string[]) {
  const uploaded = [
    ...new Set(sources.filter((source) => parseProductMedia(source))),
  ];
  if (!uploaded.length) return true;
  const rows = await db
    .select()
    .from(schema.productMedia)
    .where(
      inArray(
        schema.productMedia.id,
        uploaded.map((source) => parseProductMedia(source)!.id),
      ),
    );
  const known = new Set(
    rows.map((row) => productMediaSource(row.id, row.width, row.height)),
  );
  return uploaded.every((source) => known.has(source));
}
