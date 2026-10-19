import { describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import { crc32, deflateSync } from "node:zlib";
vi.mock("server-only", () => ({}));
import { canonicalPhoto } from "@/server/stone-requests/photo";
import { PHOTO_MAX_BYTES } from "@/features/stone-requests/input";

const valid = () =>
  PNG.sync.write({ width: 2, height: 2, data: Buffer.alloc(16, 120) });
describe("private request PNG boundary", () => {
  const chunk = (type: string, body: Buffer) => {
    const data = Buffer.alloc(body.length + 12);
    data.writeUInt32BE(body.length);
    data.write(type, 4, "ascii");
    body.copy(data, 8);
    data.writeUInt32BE(crc32(data.subarray(4, -4)), data.length - 4);
    return data;
  };
  it.each(["acTL", "tEXt", "eXIf"])(
    "rejects an otherwise valid %s metadata/animation chunk",
    async (type) => {
      const original = valid();
      const modified = Buffer.concat([
        original.subarray(0, 33),
        chunk(type, Buffer.alloc(8)),
        original.subarray(33),
      ]);
      await expect(canonicalPhoto(modified)).rejects.toThrow();
    },
  );
  it.each([2_000_000, 4 * 1024 * 1024])(
    "rejects a CRC-valid compressed payload expanding to %i bytes",
    async (length) => {
      const original = valid();
      const modified = Buffer.concat([
        original.subarray(0, 33),
        chunk("IDAT", deflateSync(Buffer.alloc(length))),
        chunk("IEND", Buffer.alloc(0)),
      ]);
      await expect(canonicalPhoto(modified)).rejects.toThrow();
    },
  );
  it("decodes and reencodes a small synthetic image", async () => {
    const photo = await canonicalPhoto(valid());
    const decoded = PNG.sync.read(photo);
    expect([decoded.width, decoded.height]).toEqual([2, 2]);
    expect(decoded.data).toEqual(Buffer.alloc(16, 120));
  });
  it.each([
    "svg",
    "trailing",
    "truncated",
    "interlaced",
    "huge-dimensions",
    "bit-depth",
    "oversized",
    "crc",
  ])("rejects %s content", async (kind) => {
    let data = valid();
    if (kind === "svg") data = Buffer.from('<svg onload="alert(1)"/>');
    if (kind === "trailing")
      data = Buffer.concat([data, Buffer.from("<script>bad</script>")]);
    if (kind === "truncated") data = data.subarray(0, -5);
    if (kind === "interlaced") data[28] = 1;
    if (kind === "huge-dimensions") data.writeUInt32BE(100000, 16);
    if (kind === "bit-depth") data[24] = 16;
    if (kind === "oversized") data = Buffer.alloc(PHOTO_MAX_BYTES + 1);
    if (kind === "crc") data[32] ^= 1;
    await expect(canonicalPhoto(data)).rejects.toThrow();
  });
});
