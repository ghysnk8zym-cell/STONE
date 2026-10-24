import {
  PRODUCT_PHOTO_BYTES,
  PRODUCT_PHOTO_ORIGINAL_BYTES,
  PRODUCT_PHOTO_SIDE,
} from "@/lib/product-media";

/** Browser convenience only; the server independently decodes and validates the PNG. */
export async function prepareProductPhoto(file: File): Promise<Blob> {
  if (
    !file.size ||
    file.size > PRODUCT_PHOTO_ORIGINAL_BYTES ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("file");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("file");
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width > 8192 ||
      bitmap.height > 8192 ||
      bitmap.width * bitmap.height > 24_000_000
    )
      throw new Error("file");
    for (const side of [PRODUCT_PHOTO_SIDE, 1280, 1024, 800]) {
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("file");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (blob && blob.size <= PRODUCT_PHOTO_BYTES) return blob;
    }
    throw new Error("file");
  } finally {
    bitmap.close();
  }
}
