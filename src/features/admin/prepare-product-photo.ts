import {
  checkPhotoSize,
  inspectPhoto,
  ProductPhotoError,
  type PhotoErrorCode,
} from "./product-photo-input";
import {
  PRODUCT_PHOTO_BYTES,
  PRODUCT_PHOTO_SIDE,
  PRODUCT_PHOTO_ORIGINAL_PIXELS,
} from "@/lib/product-media";

/** A fresh worker per photo bounds lifetime/memory, including the optional HEIC decoder. */
export async function prepareProductPhoto(file: File): Promise<Blob> {
  checkPhotoSize(file.size);
  const input = inspectPhoto(new Uint8Array(await file.arrayBuffer()));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      // Keep the worker and optional decoder separate from the initial editor bundle.
      const source = new URL(
        "./prepare-product-photo.worker.js",
        import.meta.url,
      );
      worker = new Worker(source, { type: "module" });
    } catch {
      reject(new ProductPhotoError("preparation"));
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      finish();
      reject(new ProductPhotoError("preparation"));
    }, 120_000);
    worker.onmessage = (
      event: MessageEvent<{ photo?: Blob; error?: PhotoErrorCode }>,
    ) => {
      finish();
      if (event.data.photo instanceof Blob) resolve(event.data.photo);
      else reject(new ProductPhotoError(event.data.error ?? "file"));
    };
    const failed = () => {
      finish();
      reject(new ProductPhotoError("preparation"));
    };
    worker.onerror = failed;
    worker.onmessageerror = failed;
    try {
      worker.postMessage({
        file,
        ...input,
        maxPixels: PRODUCT_PHOTO_ORIGINAL_PIXELS,
        maxSide: PRODUCT_PHOTO_SIDE,
        maxBytes: PRODUCT_PHOTO_BYTES,
        decoder: input.heic
          ? new URL(
              "../../../node_modules/heic-to/dist/next/heic-to.js",
              import.meta.url,
            ).href
          : null,
      });
    } catch {
      finish();
      reject(new ProductPhotoError("preparation"));
    }
  });
}
