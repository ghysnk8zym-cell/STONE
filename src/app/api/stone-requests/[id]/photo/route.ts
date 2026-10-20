import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/server/auth/guards";
import { getDb, schema } from "@/server/db";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
  Vary: "Cookie",
};
export async function GET(
  _request: Request,
  context: RouteContext<"/api/stone-requests/[id]/photo">,
) {
  const user = await requireUser("ru");
  const { id } = await context.params;
  const missing = () =>
    new Response(null, { status: 404, headers: privateHeaders });
  if (!z.uuid().safeParse(id).success) return missing();
  const db = await getDb();
  if (!db) return missing();
  const r = schema.stoneRequest;
  const [owner] = await db
    .select({ userId: r.userId })
    .from(r)
    .where(eq(r.id, id))
    .limit(1);
  if (!owner || (user.role !== "admin" && owner.userId !== user.id))
    return missing();
  const [image] = await db
    .select({ photo: r.photoBase64 })
    .from(r)
    .where(eq(r.id, id))
    .limit(1);
  if (!image?.photo) return missing();
  return new Response(new Uint8Array(Buffer.from(image.photo, "base64")), {
    headers: {
      ...privateHeaders,
      "Content-Type": "image/png",
      "Content-Disposition": 'inline; filename="reference.png"',
    },
  });
}
