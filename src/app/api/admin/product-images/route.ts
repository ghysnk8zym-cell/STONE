import { getSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { sameOrigin } from "@/server/same-origin";
import { productStorage } from "@/server/platform/product-storage";
import { canonicalPhoto } from "@/server/stone-requests/photo";
import {
  PRODUCT_PHOTO_BYTES,
  PRODUCT_PHOTO_SIDE,
  productMediaSource,
} from "@/lib/product-media";

/** Raw, bounded PNG body, after browser normalization. */
export async function POST(request: Request) {
  const session = await getSession();
  if (session?.user.role !== "admin")
    return new Response(null, { status: 404 });
  if (!(await sameOrigin())) return new Response(null, { status: 403 });
  if (request.headers.get("content-type") !== "image/png" || !request.body)
    return Response.json({ code: "file" }, { status: 400 });
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > PRODUCT_PHOTO_BYTES) {
        await reader.cancel();
        return Response.json({ code: "file" }, { status: 413 });
      }
      parts.push(value);
    }
  } catch {
    return Response.json({ code: "file" }, { status: 400 });
  }
  let photo: Buffer;
  try {
    photo = await canonicalPhoto(Buffer.concat(parts), {
      bytes: PRODUCT_PHOTO_BYTES,
      side: PRODUCT_PHOTO_SIDE,
      inflated: 16 * 1024 * 1024,
    });
  } catch {
    return Response.json({ code: "file" }, { status: 400 });
  }
  const db = await getDb();
  const storage = await productStorage();
  if (!db || !storage)
    return Response.json({ code: "unavailable" }, { status: 503 });
  const id = crypto.randomUUID();
  const objectKey = `${id}.png`;
  const width = photo.readUInt32BE(16);
  const height = photo.readUInt32BE(20);
  try {
    await storage.put(objectKey, new Uint8Array(photo));
    await db
      .insert(schema.productMedia)
      .values({ id, objectKey, width, height, bytes: photo.length });
  } catch {
    await storage.delete(objectKey).catch(() => {});
    return Response.json({ code: "unavailable" }, { status: 503 });
  }
  return Response.json(
    { image: productMediaSource(id, width, height) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
