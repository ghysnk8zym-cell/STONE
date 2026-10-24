import "server-only";

export interface ProductStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

/** R2 stays private. The application checks publication/admin access before serving any file. */
export async function productStorage(): Promise<ProductStorage | null> {
  if (process.env.PLATFORM === "cloudflare") {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (
      env as unknown as {
        PRODUCT_IMAGES?: {
          put(
            key: string,
            bytes: Uint8Array,
            options: unknown,
          ): Promise<unknown>;
          get(
            key: string,
          ): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
          delete(key: string): Promise<void>;
        };
      }
    ).PRODUCT_IMAGES;
    if (!bucket) return null;
    return {
      async put(key, bytes) {
        await bucket.put(key, bytes, {
          httpMetadata: { contentType: "image/png" },
        });
      },
      async get(key) {
        const object = await bucket.get(key);
        return object ? new Uint8Array(await object.arrayBuffer()) : null;
      },
      delete: (key) => bucket.delete(key),
    };
  }
  // Explicitly local development with a local database; never a silent production fallback.
  if (
    process.env.APP_ENV === "production" ||
    !process.env.DATABASE_URL?.startsWith("pglite://")
  )
    return null;
  const { localProductStorage } = await import("./product-storage-local");
  return localProductStorage();
}
