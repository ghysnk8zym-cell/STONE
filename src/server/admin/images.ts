import { parseProductMedia } from "@/lib/product-media";
import manifest from "../../../assets/figma-manifest.json";
import { seed } from "../catalog/seed";

/*
 * The pictures an admin can give a product: the catalog images of the asset manifest
 * (`images/catalog/*`, exported from Figma), alongside registered product-media uploads. The crop mode follows the picture: the studio slabs are
 * drawn uncropped (`contain`), photographs are cropped (`cover`), as the 12 seed products are.
 */

const PREFIX = "images/catalog/";

export const CATALOG_IMAGE_KEYS: readonly string[] = manifest.images
  .map((image) => image.file)
  .filter((file) => file.startsWith(PREFIX));

const fitByImage = new Map(seed.map((p) => [p.image, p.imageFit] as const));

export function isCatalogImage(key: string): boolean {
  return CATALOG_IMAGE_KEYS.includes(key);
}

export function imageFitFor(key: string): "cover" | "contain" {
  if (parseProductMedia(key)) return "contain";
  return fitByImage.get(key) ?? "cover";
}
