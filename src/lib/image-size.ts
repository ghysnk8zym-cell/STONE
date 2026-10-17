import manifest from "../../assets/figma-manifest.json";

const sizes = new Map<string, readonly [number, number]>(
  manifest.images.map((image) => [
    image.file,
    [image.sourceWidth, image.sourceHeight] as const,
  ]),
);

/** Source pixel size of a manifest image (for `next/image` width/height and aspect ratios). */
export function imageSize(key: string): readonly [number, number] {
  const size = sizes.get(key.replace(/^\//, ""));
  if (!size) throw new Error(`Image not in manifest: ${key}`);
  return size;
}
