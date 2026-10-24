import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { PNG } from "pngjs";
import { crc32 } from "node:zlib";
import {
  parseProductMedia,
  productMediaSource,
  PRODUCT_PHOTO_BYTES,
} from "@/lib/product-media";
import imageLoader from "@/lib/image-loader";
import { imageSize } from "@/lib/image-size";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  role: "admin" as string | null,
  origin: true,
  objects: new Map<string, Uint8Array>(),
  fail: false,
}));
vi.mock("@/server/auth/session", () => ({
  getSession: async () => (state.role ? { user: { role: state.role } } : null),
}));
vi.mock("@/server/same-origin", () => ({
  sameOrigin: async () => state.origin,
}));
vi.mock("@/server/platform/product-storage", () => ({
  productStorage: async () => ({
    put: async (key: string, bytes: Uint8Array) => {
      if (state.fail) throw new Error("storage");
      state.objects.set(key, bytes);
    },
    get: async (key: string) => state.objects.get(key) ?? null,
    delete: async (key: string) => {
      state.objects.delete(key);
    },
  }),
}));

describe("uploaded product media", () => {
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let schema: typeof import("@/server/db/schema");
  let upload: typeof import("@/app/api/admin/product-images/route").POST;
  let read: typeof import("@/app/api/product-images/[id]/route").GET;
  const png = () => {
    return PNG.sync.write({
      width: 24,
      height: 16,
      data: Buffer.alloc(24 * 16 * 4, 210),
    });
  };
  const post = (bytes: Uint8Array = png()) =>
    upload(
      new Request("http://localhost/api/admin/product-images", {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: new Uint8Array(bytes),
      }),
    );
  const get = (source: string) =>
    read(new Request(`http://localhost${source}`), {
      params: Promise.resolve({ id: parseProductMedia(source)!.id }),
    });

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-product-photo-secret-0123456789");
    delete (globalThis as { __stoneDb?: unknown }).__stoneDb;
    db = (await (await import("@/server/db")).getDb())!;
    schema = await import("@/server/db/schema");
    upload = (await import("@/app/api/admin/product-images/route")).POST;
    read = (await import("@/app/api/product-images/[id]/route")).GET;
  });
  afterAll(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { __stoneDb?: unknown }).__stoneDb;
  });

  it("only accepts registered same-origin references with bounded dimensions", () => {
    const source = productMediaSource(
      "12345678-1234-4234-8234-123456789012",
      24,
      16,
    );
    expect(imageLoader({ src: source, width: 390 })).toBe(source);
    expect(imageSize(source)).toEqual([24, 16]);
    for (const invalid of [
      source + "&url=https://evil.test",
      "https://evil.test/image.png",
      source.replace("24x16", "9999x16"),
      "/api/product-images/../../secret",
    ])
      expect(parseProductMedia(invalid)).toBeNull();
  });
  it("refuses guests, clients, cross-origin calls, corrupt bytes and oversized streaming bodies", async () => {
    for (const role of [null, "client"]) {
      state.role = role;
      expect((await post()).status).toBe(404);
    }
    state.role = "admin";
    state.origin = false;
    expect((await post()).status).toBe(403);
    state.origin = true;
    expect((await post(new Uint8Array([1, 2, 3]))).status).toBe(400);
    expect((await post(new Uint8Array(PRODUCT_PHOTO_BYTES + 1))).status).toBe(
      413,
    );
    expect(state.objects.size).toBe(0);
  });
  it("persists validated bytes, keeps drafts private and revokes access after unpublishing", async () => {
    const response = await post();
    expect(response.status).toBe(201);
    const { image } = await response.json();
    expect((await get(image)).status).toBe(200);
    state.role = null;
    expect((await get(image)).status).toBe(404);
    const [product] = await db
      .insert(schema.product)
      .values({
        slug: "uploaded-test",
        material: "marble",
        color: "grey",
        colorGroup: "grey",
        finish: "honed",
        format: [600, 300, 20],
        priceCents: 100,
        image,
        gallery: [image],
      })
      .returning();
    const publicImage = await get(image);
    expect(publicImage.status).toBe(200);
    expect(publicImage.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await publicImage.arrayBuffer()).subarray(0, 8)).toEqual(
      png().subarray(0, 8),
    );
    await db
      .update(schema.product)
      .set({ published: false })
      .where(eq(schema.product.id, product.id));
    expect((await get(image)).status).toBe(404);
    state.role = "admin";
    const { validProductMedia } = await import("@/server/admin/product-media");
    expect(await validProductMedia(db, [image])).toBe(true);
    expect(await validProductMedia(db, [image.replace("24x16", "25x16")])).toBe(
      false,
    );
    expect(
      await validProductMedia(db, [
        productMediaSource(crypto.randomUUID(), 24, 16),
      ]),
    ).toBe(false);
  });
  it("does not report success or leave registered media when storage fails", async () => {
    const before = (await db.select().from(schema.productMedia)).length;
    state.fail = true;
    expect((await post()).status).toBe(503);
    state.fail = false;
    expect((await db.select().from(schema.productMedia)).length).toBe(before);
  });
  it("accepts bounded browser PNGs with many small IDAT chunks without changing private request limits", async () => {
    const data = Buffer.alloc(24 * 16 * 4);
    for (let i = 0; i < data.length; i++)
      data[i] = (i * 17 + (i >> 3) * 29) % 256;
    const original = PNG.sync.write({ width: 24, height: 16, data });
    const parts = [original.subarray(0, 8)];
    let count = 0;
    for (let at = 8; at < original.length;) {
      const size = original.readUInt32BE(at);
      const end = at + 12 + size;
      if (original.toString("ascii", at + 4, at + 8) === "IDAT") {
        for (let offset = at + 8; offset < at + 8 + size; offset += 4) {
          const payload = original.subarray(
            offset,
            Math.min(offset + 4, at + 8 + size),
          );
          const chunk = Buffer.alloc(payload.length + 12);
          chunk.writeUInt32BE(payload.length);
          chunk.write("IDAT", 4);
          payload.copy(chunk, 8);
          chunk.writeUInt32BE(
            crc32(chunk.subarray(4, chunk.length - 4)),
            chunk.length - 4,
          );
          parts.push(chunk);
          count++;
        }
      } else parts.push(original.subarray(at, end));
      at = end;
    }
    expect(count).toBeGreaterThan(64);
    const fragmented = Buffer.concat(parts);
    const { canonicalPhoto } = await import("@/server/stone-requests/photo");
    await expect(canonicalPhoto(fragmented)).rejects.toThrow();
    const response = await post(fragmented);
    expect(response.status).toBe(201);
    const { image } = await response.json();
    const stored = await get(image);
    expect(PNG.sync.read(Buffer.from(await stored.arrayBuffer())).data).toEqual(
      data,
    );
  });
});
