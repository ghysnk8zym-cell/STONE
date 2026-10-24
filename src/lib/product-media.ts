/** Immutable, same-origin image references. No arbitrary remote URLs enter the image loader. */
export const PRODUCT_PHOTO_LIMIT = 8;
export const PRODUCT_PHOTO_ORIGINAL_BYTES = 5 * 1024 * 1024;
export const PRODUCT_PHOTO_BYTES = 2 * 1024 * 1024;
export const PRODUCT_PHOTO_SIDE = 1600;
const source =
  /^\/api\/product-images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\?size=([1-9]\d{0,3})x([1-9]\d{0,3})$/;

export function parseProductMedia(value: string) {
  const match = source.exec(value);
  if (!match) return null;
  const width = Number(match[2]);
  const height = Number(match[3]);
  if (width > PRODUCT_PHOTO_SIDE || height > PRODUCT_PHOTO_SIDE) return null;
  return { id: match[1], width, height };
}

export function productMediaSource(id: string, width: number, height: number) {
  return `/api/product-images/${id}?size=${width}x${height}`;
}
