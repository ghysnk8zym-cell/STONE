import {
  ORIGINAL_PHOTO_MAX_BYTES,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
} from "./input";

/** Client convenience only. The server independently validates every submitted byte. */
export async function preparePhoto(file: File): Promise<File> {
  if (
    !file.size ||
    file.size > ORIGINAL_PHOTO_MAX_BYTES ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("photo");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width > 8192 ||
      bitmap.height > 8192 ||
      bitmap.width * bitmap.height > 24_000_000
    )
      throw new Error("photo");
    for (const side of [PHOTO_MAX_SIDE, 384, 288]) {
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("photo");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (blob && blob.size <= PHOTO_MAX_BYTES)
        return new File([blob], "reference.png", { type: "image/png" });
    }
    throw new Error("photo");
  } finally {
    bitmap.close();
  }
}
