import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import {
  checkPhotoDimensions,
  checkPhotoSize,
  inspectPhoto,
  ProductPhotoError,
} from "@/features/admin/product-photo-input";

const box = (kind: string, ...contents: Buffer[]) => {
  const payload = Buffer.concat(contents);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(payload.length + 8);
  head.write(kind, 4);
  return Buffer.concat([head, payload]);
};
const heif = (brand: string, width = 4032, height = 3024) => {
  const extent = Buffer.alloc(12);
  extent.writeUInt32BE(width, 4);
  extent.writeUInt32BE(height, 8);
  return Buffer.concat([
    box("ftyp", Buffer.from(brand), Buffer.alloc(4), Buffer.from(brand)),
    box("meta", Buffer.alloc(4), box("iprp", box("ipco", box("ispe", extent)))),
  ]);
};
const jpeg = (width: number, height: number) => {
  const bytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe1, 0, 4, 0, 0, 0xff, 0xc0, 0, 8, 8, 0, 0, 0, 0, 3,
  ]);
  bytes.writeUInt16BE(height, 13);
  bytes.writeUInt16BE(width, 15);
  return bytes;
};

describe("original product photo preflight", () => {
  it("accepts the agreed byte/pixel boundaries and larger phone photos", () => {
    expect(() => checkPhotoSize(30 * 1024 * 1024)).not.toThrow();
    expect(() => checkPhotoSize(30 * 1024 * 1024 + 1)).toThrow("size");
    expect(() => checkPhotoDimensions(10_000, 6000)).not.toThrow();
    expect(() => checkPhotoDimensions(10_000, 6001)).toThrow("pixels");
    expect(inspectPhoto(jpeg(8064, 6048)).mime).toBe("image/jpeg");
    expect(() => inspectPhoto(jpeg(16_000, 12_000))).toThrow("pixels");
    expect(() => checkPhotoDimensions(0, 1)).toThrow("file");
  });
  it("identifies PNG and actual catalog WebP by bytes, without filename or MIME", () => {
    const png = PNG.sync.write({
      width: 24,
      height: 16,
      data: Buffer.alloc(24 * 16 * 4, 120),
    });
    expect(inspectPhoto(png)).toEqual({ mime: "image/png", heic: false });
    for (const name of ["black-marble", "grey-marble", "grey-limestone"])
      expect(
        inspectPhoto(readFileSync(`public/images/catalog/${name}-390.webp`)),
      ).toEqual({ mime: "image/webp", heic: false });
  });
  it("checks HEIF/AVIF property dimensions before decoding and rejects video containers", () => {
    for (const brand of ["heic", "heix", "mif1"])
      expect(inspectPhoto(heif(brand))).toEqual({
        mime: "image/heic",
        heic: true,
      });
    expect(inspectPhoto(heif("avif"))).toEqual({
      mime: "image/avif",
      heic: false,
    });
    expect(() => inspectPhoto(heif("heic", 10_000, 6001))).toThrow("pixels");
    expect(() => inspectPhoto(heif("avif", 10_000, 6001))).toThrow("pixels");
    expect(() => inspectPhoto(heif("mp42"))).toThrow("file");
    expect(() => inspectPhoto(heif("heic").subarray(0, 20))).toThrow("file");
  });
  it("understands Windows and OS/2 BMP dimensions, including top-down photos", () => {
    const bytes = Buffer.alloc(54);
    bytes.write("BM");
    bytes.writeUInt32LE(40, 14);
    bytes.writeInt32LE(240, 18);
    bytes.writeInt32LE(-160, 22);
    expect(inspectPhoto(bytes).mime).toBe("image/bmp");
    bytes.writeUInt32LE(12, 14);
    bytes.writeUInt16LE(240, 18);
    bytes.writeUInt16LE(160, 20);
    expect(inspectPhoto(bytes).mime).toBe("image/bmp");
  });
  it("rejects corrupt headers through a recoverable photo error, never an unchecked read", () => {
    const fixtures = [heif("heic"), heif("avif"), jpeg(240, 160)];
    for (const fixture of fixtures) {
      for (let length = 0; length < fixture.length; length++) {
        try {
          inspectPhoto(fixture.subarray(0, length));
        } catch (error) {
          expect(error).toBeInstanceOf(ProductPhotoError);
        }
      }
    }
    expect(() => inspectPhoto(Buffer.from("<svg></svg>"))).toThrow("file");
  });
});
