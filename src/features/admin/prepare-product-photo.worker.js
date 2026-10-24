// Standalone module worker: supplied settings come from the TypeScript preflight.
// No imports into the application graph; the HEIC decoder is a separate on-demand asset.
self.onmessage = async ({ data }) => {
  const { file, mime, heic, decoder, maxPixels, maxSide, maxBytes } = data;
  let bitmap;
  try {
    const blob = new Blob([file], { type: mime });
    try {
      bitmap = await createImageBitmap(blob, {
        imageOrientation: "from-image",
      });
    } catch {
      if (!heic) throw new Error("file");
      const { heicTo } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ decoder
      );
      try {
        bitmap = await heicTo({ blob, type: "bitmap" });
      } catch {
        throw new Error("file");
      }
    }
    if (!bitmap.width || !bitmap.height) throw new Error("file");
    if (bitmap.width * bitmap.height > maxPixels) throw new Error("pixels");
    for (const side of [maxSide, 1280, 1024, 800]) {
      const ratio = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = new OffscreenCanvas(
        Math.max(1, Math.round(bitmap.width * ratio)),
        Math.max(1, Math.round(bitmap.height * ratio)),
      );
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("preparation");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const png = await canvas.convertToBlob({ type: "image/png" });
        if (png.size <= maxBytes) {
          self.postMessage({ photo: png });
          return;
        }
      } finally {
        canvas.width = 1;
        canvas.height = 1;
      }
    }
    throw new Error("preparation");
  } catch (error) {
    self.postMessage({
      error: ["file", "pixels"].includes(error?.message)
        ? error.message
        : "preparation",
    });
  } finally {
    bitmap?.close();
  }
};
