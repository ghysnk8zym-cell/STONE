// Builds the WebP width sets listed in assets/figma-manifest.json (`pnpm images`).
//
// Source rasters live in assets/source/ (git-ignored) and are re-downloadable through the
// Figma read tools using the `node` ids in the manifest. For every entry the script:
//   1. finds assets/source/<file minus "images/">.(png|jpg|jpeg|webp),
//   2. writes public/<file>-<width>.webp for each requested width that does not exceed the
//      source width (never upscaled), WebP quality 82,
//   3. records sourceWidth, sourceHeight and the emitted `widths` back into the manifest,
//   4. removes stale outputs of the same image and fails if any output exceeds 1 MB.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "assets", "figma-manifest.json");
const sourceDir = join(root, "assets", "source");
const publicDir = join(root, "public");
const MAX_BYTES = 1024 * 1024;
const QUALITY = 82;
const EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

// pnpm does not hoist sharp to the repo root; it ships as a dependency of Next.js, so fall
// back to resolving it through Next's own package. No dependency is added to package.json.
function loadSharp() {
  const rootRequire = createRequire(join(root, "package.json"));
  try {
    return rootRequire("sharp");
  } catch {
    const nextRequire = createRequire(rootRequire.resolve("next/package.json"));
    return nextRequire("sharp");
  }
}

function findSource(file) {
  const stem = join(sourceDir, file.replace(/^images\//, ""));
  const found = EXTENSIONS.map((ext) => `${stem}.${ext}`).find((path) =>
    existsSync(path),
  );
  if (!found) {
    throw new Error(
      `Missing source for ${file}: expected ${stem}.(${EXTENSIONS.join("|")})`,
    );
  }
  return found;
}

function staleOutputs(file, keep) {
  const dir = dirname(join(publicDir, file));
  if (!existsSync(dir)) return [];
  const name = basename(file);
  const pattern = new RegExp(
    `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)\\.webp$`,
  );
  return readdirSync(dir)
    .filter((entry) => {
      const match = pattern.exec(entry);
      return match && !keep.includes(Number(match[1]));
    })
    .map((entry) => join(dir, entry));
}

const sharp = loadSharp();
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
let total = 0;

for (const image of manifest.images) {
  const source = findSource(image.file);
  const { width: sourceWidth, height: sourceHeight } =
    await sharp(source).metadata();
  const widths = image.requestedWidths.filter((width) => width <= sourceWidth);
  if (widths.length === 0) {
    throw new Error(
      `${image.file}: source is ${sourceWidth}px wide, smaller than every requested width`,
    );
  }

  for (const width of widths) {
    const output = join(publicDir, `${image.file}-${width}.webp`);
    mkdirSync(dirname(output), { recursive: true });
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(output);
    const { size } = statSync(output);
    if (size > MAX_BYTES)
      throw new Error(`${output} is ${size} bytes (limit ${MAX_BYTES})`);
    total += size;
  }

  for (const stale of staleOutputs(image.file, widths)) unlinkSync(stale);

  image.sourceWidth = sourceWidth;
  image.sourceHeight = sourceHeight;
  image.widths = widths;
  console.log(
    `${image.file}: ${sourceWidth}x${sourceHeight} -> ${widths.join(", ")}`,
  );
}

// Stable key order: identity first, then source facts, then what was emitted.
manifest.images = manifest.images.map(
  ({
    file,
    node,
    sourceWidth,
    sourceHeight,
    requestedWidths,
    widths,
    usage,
  }) => ({
    file,
    node,
    sourceWidth,
    sourceHeight,
    requestedWidths,
    widths,
    usage,
  }),
);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Done: ${manifest.images.length} images, ${(total / 1024 / 1024).toFixed(2)} MB`,
);
