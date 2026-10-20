import "server-only";
import { PNG } from "pngjs";
import { inflateSync } from "node:zlib";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
} from "@/features/stone-requests/input";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const allowed = new Set([
  "IHDR",
  "IDAT",
  "IEND",
  "sRGB",
  "gAMA",
  "cHRM",
  "pHYs",
]);

/** Only bounded, noninterlaced browser PNGs reach the streaming decoder. */
export async function canonicalPhoto(input: Buffer): Promise<Buffer> {
  const invalid = () => {
    throw new Error("Invalid reference photo");
  };
  if (
    input.length < 45 ||
    input.length > PHOTO_MAX_BYTES ||
    !input.subarray(0, 8).equals(signature)
  )
    invalid();
  if (
    input.readUInt32BE(8) !== 13 ||
    input.toString("ascii", 12, 16) !== "IHDR"
  )
    invalid();
  const width = input.readUInt32BE(16);
  const height = input.readUInt32BE(20);
  if (
    !width ||
    !height ||
    width > PHOTO_MAX_SIDE ||
    height > PHOTO_MAX_SIDE ||
    input[24] !== 8 ||
    ![2, 6].includes(input[25]) ||
    input[26] !== 0 ||
    input[27] !== 0 ||
    input[28] !== 0
  )
    invalid();
  let offset = 8;
  let chunks = 0;
  let dataSeen = false;
  let endSeen = false;
  const imageData: Buffer[] = [];
  while (offset < input.length) {
    if (++chunks > 64 || offset + 12 > input.length) invalid();
    const length = input.readUInt32BE(offset);
    const type = input.toString("ascii", offset + 4, offset + 8);
    if (
      !allowed.has(type) ||
      offset + 12 + length > input.length ||
      (type === "IHDR" && offset !== 8)
    )
      invalid();
    if (type === "IDAT") {
      dataSeen = true;
      imageData.push(input.subarray(offset + 8, offset + 8 + length));
    }
    if (type === "IEND") {
      if (length !== 0 || offset + 12 !== input.length || !dataSeen) invalid();
      endSeen = true;
    }
    offset += 12 + length;
  }
  if (!endSeen) invalid();
  // Public zlib caps inflated output before pngjs's streaming decoder.
  // PNG.sync.read uses private Node internals and fails on workerd; do not use it here.
  const expected = height * (1 + width * (input[25] === 6 ? 4 : 3));
  // Local workerd rejects some valid PNGs with an exact scanline-size cap.
  // Keep a fixed 2 MiB inflated-output cap, then require the exact image size.
  const inflated = inflateSync(Buffer.concat(imageData), {
    maxOutputLength: 2 * 1024 * 1024,
  });
  if (inflated.length !== expected) invalid();
  const decoded = await new Promise<PNG>((resolve, reject) => {
    new PNG({ checkCRC: true }).parse(input, (error, result) =>
      error || !result
        ? reject(error ?? new Error("Invalid reference photo"))
        : resolve(result),
    );
  });
  const result = PNG.sync.write(
    { width, height, data: decoded.data },
    { colorType: 6, bitDepth: 8, deflateLevel: 6 },
  );
  if (result.length > PHOTO_MAX_BYTES) invalid();
  return result;
}
