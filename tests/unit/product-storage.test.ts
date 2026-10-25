import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: state.env }),
}));
import { productStorage } from "@/server/platform/product-storage";

afterEach(() => {
  vi.unstubAllEnvs();
  state.env = {};
});
describe("product storage platform adapter", () => {
  it("does not silently use local disk when R2 is missing or a remote Node database is configured", async () => {
    vi.stubEnv("PLATFORM", "cloudflare");
    expect(await productStorage()).toBeNull();
    vi.stubEnv("PLATFORM", "node");
    vi.stubEnv("DATABASE_URL", "postgres://example.invalid/stone");
    expect(await productStorage()).toBeNull();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("APP_ENV", "production");
    expect(await productStorage()).toBeNull();
  });
  it("uses the private R2 binding for put/get/delete without exposing a bucket URL", async () => {
    vi.stubEnv("PLATFORM", "cloudflare");
    const bytes = new Uint8Array([1, 2, 3]);
    const put = vi.fn();
    const remove = vi.fn();
    state.env.PRODUCT_IMAGES = {
      put,
      delete: remove,
      get: async (key: string) =>
        key === "found" ? { arrayBuffer: async () => bytes.buffer } : null,
    };
    const storage = (await productStorage())!;
    await storage.put("image.png", bytes);
    expect(put).toHaveBeenCalledWith("image.png", bytes, {
      httpMetadata: { contentType: "image/png" },
    });
    expect(await storage.get("found")).toEqual(bytes);
    expect(await storage.get("missing")).toBeNull();
    await storage.delete("image.png");
    expect(remove).toHaveBeenCalledWith("image.png");
  });
});
