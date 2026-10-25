import {
  PRODUCT_PHOTO_ORIGINAL_BYTES,
  PRODUCT_PHOTO_ORIGINAL_PIXELS,
} from "@/lib/product-media";

export type PhotoErrorCode = "file" | "size" | "pixels" | "preparation";
export class ProductPhotoError extends Error {
  constructor(public readonly code: PhotoErrorCode) {
    super(code);
  }
}

export const PRODUCT_PHOTO_ACCEPT =
  ".jpg,.jpeg,.jfif,.png,.webp,.avif,.bmp,.heic,.heif,image/jpeg,image/png,image/webp,image/avif,image/bmp,image/heic,image/heif";

export function checkPhotoSize(size: number) {
  if (!size) throw new ProductPhotoError("file");
  if (size > PRODUCT_PHOTO_ORIGINAL_BYTES) throw new ProductPhotoError("size");
}

export function checkPhotoDimensions(width: number, height: number) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new ProductPhotoError("file");
  if (width * height > PRODUCT_PHOTO_ORIGINAL_PIXELS)
    throw new ProductPhotoError("pixels");
}

/** Inspect actual bytes before allocating decoded pixels. MIME/extension are only picker hints. */
export function inspectPhoto(bytes: Uint8Array): {
  mime: string;
  heic: boolean;
} {
  checkPhotoSize(bytes.length);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number, count: number) =>
    String.fromCharCode(...bytes.subarray(at, at + count));
  const dimensions = (
    width: number,
    height: number,
    mime: string,
    heic = false,
  ) => {
    checkPhotoDimensions(width, height);
    return { mime, heic };
  };
  if (
    bytes.length >= 24 &&
    text(0, 8) === "\x89PNG\r\n\x1a\n" &&
    text(12, 4) === "IHDR"
  )
    return dimensions(view.getUint32(16), view.getUint32(20), "image/png");
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker) &&
        length >= 8
      )
        return dimensions(
          view.getUint16(offset + 5),
          view.getUint16(offset + 3),
          "image/jpeg",
        );
      offset += length;
    }
  }
  if (bytes.length >= 26 && text(0, 2) === "BM") {
    const dib = view.getUint32(14, true);
    if (dib === 12)
      return dimensions(
        view.getUint16(18, true),
        view.getUint16(20, true),
        "image/bmp",
      );
    if (dib >= 40)
      return dimensions(
        view.getInt32(18, true),
        Math.abs(view.getInt32(22, true)),
        "image/bmp",
      );
  }
  if (bytes.length >= 30 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    const uint24 = (at: number) =>
      bytes[at] + bytes[at + 1] * 256 + bytes[at + 2] * 65536;
    for (let at = 12; at + 8 <= bytes.length;) {
      const kind = text(at, 4);
      const size = view.getUint32(at + 4, true);
      const payload = at + 8;
      if (payload + size > bytes.length) break;
      if (kind === "VP8X" && size >= 10)
        return dimensions(
          uint24(payload + 4) + 1,
          uint24(payload + 7) + 1,
          "image/webp",
        );
      if (kind === "VP8L" && size >= 5 && bytes[payload] === 0x2f) {
        const bits = view.getUint32(payload + 1, true);
        return dimensions(
          (bits & 0x3fff) + 1,
          ((bits >>> 14) & 0x3fff) + 1,
          "image/webp",
        );
      }
      if (
        kind === "VP8 " &&
        size >= 10 &&
        text(payload + 3, 3) === "\x9d\x01\x2a"
      )
        return dimensions(
          view.getUint16(payload + 6, true) & 0x3fff,
          view.getUint16(payload + 8, true) & 0x3fff,
          "image/webp",
        );
      at = payload + size + (size % 2);
    }
  }
  if (bytes.length >= 16 && text(4, 4) === "ftyp") {
    const ftypSize = view.getUint32(0);
    if (ftypSize < 16 || ftypSize > bytes.length)
      throw new ProductPhotoError("file");
    const brands = [text(8, 4)];
    for (let at = 16; at + 4 <= ftypSize; at += 4) brands.push(text(at, 4));
    const avif = brands.includes("avif");
    const heic =
      !avif &&
      brands.some((brand) =>
        ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand),
      );
    if (!avif && !heic) throw new ProductPhotoError("file");
    let found = false;
    let count = 0;
    const boxes = (start: number, end: number, depth = 0) => {
      for (let at = start; at + 8 <= end;) {
        if (++count > 20_000 || depth > 5) throw new ProductPhotoError("file");
        let size = view.getUint32(at);
        let header = 8;
        if (size === 1) {
          if (at + 16 > end) throw new ProductPhotoError("file");
          size = view.getUint32(at + 8) * 2 ** 32 + view.getUint32(at + 12);
          header = 16;
        } else if (!size) size = end - at;
        if (!Number.isSafeInteger(size) || size < header || at + size > end)
          throw new ProductPhotoError("file");
        const kind = text(at + 4, 4);
        const payload = at + header;
        if (kind === "ispe") {
          if (size < header + 12) throw new ProductPhotoError("file");
          checkPhotoDimensions(
            view.getUint32(payload + 4),
            view.getUint32(payload + 8),
          );
          found = true;
        } else if (["meta", "iprp", "ipco"].includes(kind)) {
          boxes(payload + (kind === "meta" ? 4 : 0), at + size, depth + 1);
        }
        at += size;
      }
    };
    boxes(ftypSize, bytes.length);
    if (found) return { mime: avif ? "image/avif" : "image/heic", heic };
  }
  throw new ProductPhotoError("file");
}
