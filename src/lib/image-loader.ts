import manifest from "../../assets/figma-manifest.json";
import { parseProductMedia } from "./product-media";

// Prepared widths per image, keyed by manifest `file` (no leading slash, no extension).
const widthsByFile = new Map<string, readonly number[]>(
  manifest.images.map((image) => [image.file, image.widths]),
);

/**
 * Single `next/image` loader for every host (images.loader: "custom"). Images are
 * pre-optimised static files in public/, so there is no runtime optimisation and no
 * dependency on Vercel, Cloudflare Images or sharp at runtime.
 *
 * `src` is the manifest key, with or without a leading slash. Returns the root-relative
 * URL of the smallest prepared width that covers `width`, or the largest one when the
 * request is bigger than anything prepared.
 */
export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}): string {
  if (parseProductMedia(src)) return src;
  const file = src.replace(/^\//, "");
  const widths = widthsByFile.get(file);
  if (!widths || widths.length === 0) {
    throw new Error(`Image not in manifest: ${src}`);
  }
  const sorted = [...widths].sort((a, b) => a - b);
  const chosen = sorted.find((w) => w >= width) ?? sorted[sorted.length - 1];
  return `/${file}-${chosen}.webp`;
}
