import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { productMediaSource } from "@/lib/product-media";
import { getSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { productStorage } from "@/server/platform/product-storage";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/product-images/[id]">,
) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const db = await getDb();
  if (!db) return new Response(null, { status: 404 });
  const [media] = await db
    .select()
    .from(schema.productMedia)
    .where(eq(schema.productMedia.id, id))
    .limit(1);
  if (!media) return new Response(null, { status: 404 });
  const source = productMediaSource(id, media.width, media.height);
  const [published] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.published, true),
        or(
          eq(schema.product.image, source),
          sql`${source} = any(${schema.product.gallery})`,
        ),
      ),
    )
    .limit(1);
  if (!published && (await getSession())?.user.role !== "admin")
    return new Response(null, { status: 404 });
  const storage = await productStorage();
  const bytes = await storage?.get(media.objectKey);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
