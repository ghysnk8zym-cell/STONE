// Visual comparison of the styleguide against the Figma reference screenshots (Phase 2, Task 10).
//
//   pnpm build && pnpm start        # in another terminal; this script starts nothing itself
//   pnpm qa:visual                  # BASE_URL (default http://localhost:3000), QA_IDS=a,b filters ids
//
// `tests/visual/figma/references.json` is the source of truth:
//   references["<id>-<width>"] = { node, note, caveat?, locale?, box?, offset?, sameAs? }
//     caveat shown in the notes column of the results table (e.g. an unreliable reference)
//     id     the `data-qa` value of the styleguide block (sections/qa-ids.ts)
//     width  viewport width, 1440 or 390
//     node   Figma node the PNG was taken from (file 1vEGuD9cYYFNynyByUGHwF)
//     locale styleguide locale; defaults to "en" (the Figma copy is English, except the tab bar)
//     box    [w, h] layout size of the node when the PNG is larger (shadow / focus ring bleed)
//     offset [x, y] top-left corner of that box inside the PNG; the implementation is shot with the
//            same margin around the component so both images show the same area
//     sameAs another key whose PNG is reused (components that do not change with the viewport)
//   skipped["<id>-<width>"] = reason the pair is not compared
// The PNG of an entry is `tests/visual/figma/<key>.png` (or the one of `sameAs`).
//
// For each entry the script screenshots the component of `[data-qa="<id>"]` on `/<locale>/_styleguide`
// at that viewport (deviceScaleFactor 1), pads both images to the larger size, runs pixelmatch and
// writes `docs/QA/phase-2/<key>-{impl,figma,diff}.png` plus `docs/QA/phase-2/results.md`.
// It is a report, not a gate: a high mismatch still exits 0. It exits 1 when a referenced element is
// missing or not visible, or a reference PNG cannot be read.
//
// "The component" is the single child of the stage (the stage itself is styleguide chrome: border and
// padding). For headers, footer and tab bar the stage holds a photo frame; the backdrop photo is
// hidden and the real component inside is shot, so glass sits on the page colour like the Figma node.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIGMA_DIR = path.join(ROOT, "tests", "visual", "figma");
const OUT_DIR = path.join(ROOT, "docs", "QA", "phase-2");
const WIDTHS = [1440, 390];
const DEFAULT_LOCALE = "en";
const VIEWPORT_HEIGHT = 900;
const PAGE_BG_FALLBACK = [255, 255, 255];

/**
 * Share of differing pixels as a percentage, rounded to two decimals.
 * @param {number} diffPixels
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function mismatchPercent(diffPixels, width, height) {
  if (!(width > 0) || !(height > 0)) {
    // Dividing by a zero area would give NaN/Infinity and read as a result.
    throw new Error(`Invalid image size ${width}x${height}`);
  }
  return Math.round((diffPixels / (width * height)) * 10000) / 100;
}

/**
 * Splits a reference key `<id>-<width>` into the `data-qa` id and the viewport width; null when the
 * key does not end in a known width.
 * @param {string} key
 * @returns {{ id: string, width: number, key: string } | null}
 */
export function parseReferenceKey(key) {
  const match = /^(.+)-(\d+)$/.exec(key);
  if (!match) return null;
  const width = Number(match[2]);
  if (!WIDTHS.includes(width)) return null;
  return { id: match[1], width, key };
}

/**
 * Copies `src` onto a `width`x`height` canvas filled with `bg`, top-left aligned. Used for both
 * images: it pads the smaller one and flattens transparency (Figma frames without a fill) onto the
 * page background so that only real differences are counted.
 * @param {PNG} src
 * @param {number} width
 * @param {number} height
 * @param {number[]} bg
 * @returns {PNG}
 */
function flattenOnto(src, width, height, bg) {
  const out = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    out.data[i * 4] = bg[0];
    out.data[i * 4 + 1] = bg[1];
    out.data[i * 4 + 2] = bg[2];
    out.data[i * 4 + 3] = 255;
  }
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const s = (y * src.width + x) * 4;
      const d = (y * width + x) * 4;
      const a = src.data[s + 3] / 255;
      for (let c = 0; c < 3; c += 1) {
        out.data[d + c] = Math.round(
          src.data[s + c] * a + out.data[d + c] * (1 - a),
        );
      }
    }
  }
  return out;
}

/** @param {string} value CSS `rgb(...)`/`rgba(...)` colour @returns {number[] | null} */
function parseCssColor(value) {
  const match =
    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Resolves once React has hydrated and committed the page (same probe as tests/e2e/styleguide.spec.ts). */
async function hydrated(page) {
  await page.waitForFunction(
    () => {
      const main = document.querySelector("main");
      if (!main) return false;
      let last = main;
      while (last.lastElementChild) last = last.lastElementChild;
      const probes = [
        last,
        main.querySelector('[data-qa="mobile-menu-trigger"] button'),
      ];
      return probes.every((el) => {
        if (!el) return false;
        const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
        if (!key) return false;
        let fiber = el[key];
        while (fiber.return) fiber = fiber.return;
        return fiber.tag === 3 && fiber.stateNode.current === fiber;
      });
    },
    undefined,
    { timeout: 20_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

const LEGEND = [
  "Method: styleguide in en (tab bar in ru, the Figma labels are Russian); deviceScaleFactor 1, reduced motion, animations disabled, images loaded before each shot.",
  "Shot: the single child of the [data-qa] stage (not the stage); for header, footer and tab bar the backdrop photo is hidden; the stage border is made transparent so it cannot leak into a margin.",
  "Both images are padded to the larger size and flattened on the same ground colour (first opaque ancestor background); pixelmatch threshold 0.1, anti-aliasing ignored.",
  'Notes: "same PNG as 1440" = viewport-independent component, the 390 row reuses the 1440 reference (count unique comparisons without them).',
];

/**
 * Markdown report: method legend, result table, and the pairs that are not compared.
 * @param {{ id: string, width: number, mismatch: string, impl: string, figma: string, sameAs?: boolean, caveat?: string }[]} rows
 * @param {{ id: string, width: number, reason: string }[]} skipped
 * @returns {string}
 */
export function formatResults(rows, skipped) {
  const lines = [
    ...LEGEND,
    "",
    "| id | width | mismatch % | impl WxH | figma WxH | notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => {
      const notes = [r.sameAs ? "same PNG as 1440" : "", r.caveat ?? ""]
        .filter(Boolean)
        .join("; ");
      return `| ${r.id} | ${r.width} | ${r.mismatch} | ${r.impl} | ${r.figma} | ${notes} |`;
    }),
  ];
  if (skipped.length > 0) {
    lines.push(
      "",
      "Not compared:",
      "",
      "| id | width | reason |",
      "| --- | --- | --- |",
    );
    lines.push(...skipped.map((s) => `| ${s.id} | ${s.width} | ${s.reason} |`));
  }
  return lines.join("\n");
}

/**
 * Locates the component to shoot inside a stage and prepares it. Returns the locator.
 * @param {import("@playwright/test").Locator} stage
 */
async function componentOf(stage) {
  // The stage border (translucent glass, 1px) would show in a clipped margin; Figma draws none.
  // Only the colour changes, so the box and every clip coordinate stay the same.
  await stage.evaluate((el) => {
    el.style.borderColor = "transparent";
  });
  const photoFrameChildren = stage.locator(":scope > div > :not(img)");
  const hasPhoto =
    (await stage.locator(":scope > div > img.-z-10").count()) > 0;
  if (hasPhoto && (await photoFrameChildren.count()) === 1) {
    // Header, footer and tab bar sit on a photo; Figma draws them on the page colour.
    await stage.locator(":scope > div > img.-z-10").evaluate((img) => {
      img.style.visibility = "hidden";
    });
    return photoFrameChildren;
  }
  const inner = stage.locator(":scope > *");
  if ((await inner.count()) === 1) return inner;
  console.warn(
    `warning: ${await stage.getAttribute("data-qa")} has ${await inner.count()} children, shooting the whole stage`,
  );
  return stage;
}

/**
 * Scrolls the stage into view and waits until every image inside it is loaded and decoded, so a
 * lazy `next/image` is never shot as a placeholder. Throws (failing the pair) after `timeout` ms.
 * A stage without images (placeholder cards) resolves at once.
 * @param {import("@playwright/test").Locator} stage
 */
async function imagesReady(stage, timeout = 15_000) {
  await stage.scrollIntoViewIfNeeded();
  const failed = await stage.evaluate(async (el, ms) => {
    const bad = [];
    await Promise.all(
      [...el.querySelectorAll("img")].map(async (img) => {
        const limit = new Promise((resolve) =>
          setTimeout(resolve, ms, "timeout"),
        );
        const outcome = await Promise.race([
          img.decode().then(
            () => "ok",
            () => "error",
          ),
          limit,
        ]);
        if (outcome !== "ok" || !img.complete || img.naturalWidth === 0) {
          bad.push(`${img.currentSrc || img.src} (${outcome})`);
        }
      }),
    );
    return bad;
  }, timeout);
  if (failed.length > 0) {
    throw new Error(
      `image(s) not loaded before the shot: ${failed.join(", ")}`,
    );
  }
}

async function main() {
  const baseURL = (process.env.BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const only = process.env.QA_IDS
    ? new Set(
        process.env.QA_IDS.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  const manifest = await readJson(path.join(FIGMA_DIR, "references.json"), {});
  const entries = manifest.references ?? {};
  const failures = [];

  const jobs = [];
  for (const [key, entry] of Object.entries(entries)) {
    const parsed = parseReferenceKey(key);
    if (!parsed) {
      failures.push(`${key}: not an "<id>-<width>" key`);
      continue;
    }
    if (only && !only.has(parsed.id)) continue;
    jobs.push({
      ...parsed,
      entry,
      locale: entry.locale ?? DEFAULT_LOCALE,
      file: path.join(FIGMA_DIR, `${entry.sameAs ?? key}.png`),
    });
  }
  if (jobs.length === 0) {
    console.error("No references found for the selected ids.");
    process.exitCode = 1;
    return;
  }

  // A PNG nobody refers to is usually a forgotten mapping.
  const used = new Set(
    Object.entries(entries).map(([key, e]) => `${e.sameAs ?? key}.png`),
  );
  for (const file of await readdir(FIGMA_DIR)) {
    if (file.endsWith(".png") && !used.has(file)) {
      console.warn(`warning: ${file} is not referenced in references.json`);
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const rows = [];

  try {
    for (const width of WIDTHS) {
      for (const locale of new Set(jobs.map((job) => job.locale))) {
        const group = jobs.filter(
          (job) => job.width === width && job.locale === locale,
        );
        if (group.length === 0) continue;
        const context = await browser.newContext({
          viewport: { width, height: VIEWPORT_HEIGHT },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const response = await page.goto(`${baseURL}/${locale}/_styleguide`);
        if (!response || response.status() !== 200) {
          failures.push(
            `GET /${locale}/_styleguide at ${width}: HTTP ${response?.status()}`,
          );
          await context.close();
          continue;
        }
        await hydrated(page);

        for (const job of group) {
          try {
            const figma = PNG.sync.read(await readFile(job.file));
            const stage = page.locator(`[data-qa="${job.id}"]`);
            if ((await stage.count()) !== 1) {
              throw new Error(
                `[data-qa="${job.id}"] matched ${await stage.count()} elements`,
              );
            }
            if (!(await stage.isVisible())) {
              throw new Error(
                `[data-qa="${job.id}"] is not visible at ${width}px`,
              );
            }
            await imagesReady(stage);
            const locator = await componentOf(stage);
            // The ground the component sits on: the first opaque background above it (the component's
            // own translucent fill is part of what is compared).
            const bg =
              parseCssColor(
                await locator.evaluate((el) => {
                  for (
                    let node = el.parentElement;
                    node;
                    node = node.parentElement
                  ) {
                    const color = getComputedStyle(node).backgroundColor;
                    const alpha = /rgba\(.*,\s*([\d.]+)\)$/.exec(color);
                    if (color.startsWith("rgb") && (!alpha || alpha[1] === "1"))
                      return color;
                  }
                  return "";
                }),
              ) ?? PAGE_BG_FALLBACK;

            // The Figma PNG is bigger than the node's layout box when shadows or focus rings bleed
            // out of it; shoot the same margin around the component.
            const [boxW, boxH] = job.entry.box ?? [figma.width, figma.height];
            const [offX, offY] = job.entry.offset ?? [0, 0];
            const left = offX;
            const top = offY;
            const right = Math.max(0, figma.width - boxW - offX);
            const bottom = Math.max(0, figma.height - boxH - offY);
            const shot = { animations: "disabled", caret: "hide" };
            let buffer;
            if (left || top || right || bottom) {
              const rect = await locator.evaluate((el) => {
                const r = el.getBoundingClientRect();
                return {
                  x: r.x + window.scrollX,
                  y: r.y + window.scrollY,
                  width: r.width,
                  height: r.height,
                };
              });
              const x = Math.max(0, Math.floor(rect.x - left));
              const y = Math.max(0, Math.floor(rect.y - top));
              buffer = await page.screenshot({
                ...shot,
                fullPage: true,
                clip: {
                  x,
                  y,
                  width: Math.ceil(rect.x + rect.width + right) - x,
                  height: Math.ceil(rect.y + rect.height + bottom) - y,
                },
              });
            } else {
              buffer = await locator.screenshot(shot);
            }
            const impl = PNG.sync.read(buffer);

            const w = Math.max(impl.width, figma.width);
            const h = Math.max(impl.height, figma.height);
            const a = flattenOnto(impl, w, h, bg);
            const b = flattenOnto(figma, w, h, bg);
            const diff = new PNG({ width: w, height: h });
            const diffPixels = pixelmatch(a.data, b.data, diff.data, w, h, {
              threshold: 0.1,
              includeAA: false,
            });

            await writeFile(
              path.join(OUT_DIR, `${job.key}-impl.png`),
              PNG.sync.write(a),
            );
            await writeFile(
              path.join(OUT_DIR, `${job.key}-figma.png`),
              PNG.sync.write(b),
            );
            await writeFile(
              path.join(OUT_DIR, `${job.key}-diff.png`),
              PNG.sync.write(diff),
            );
            rows.push({
              id: job.id,
              width,
              mismatch: mismatchPercent(diffPixels, w, h).toFixed(2),
              impl: `${impl.width}x${impl.height}`,
              figma: `${figma.width}x${figma.height}`,
              sameAs: Boolean(job.entry.sameAs),
              caveat: job.entry.caveat,
            });
          } catch (error) {
            failures.push(
              `${job.key}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const skipped = Object.entries(manifest.skipped ?? {})
    .map(([key, reason]) => ({ ...parseReferenceKey(key), reason }))
    .filter((s) => s.id && (!only || only.has(s.id)));
  const table = formatResults(rows, skipped);
  await writeFile(path.join(OUT_DIR, "results.md"), `${table}\n`);
  console.log(table);

  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
