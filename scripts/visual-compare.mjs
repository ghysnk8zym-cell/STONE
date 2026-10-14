// Visual comparison against the Figma reference screenshots: component mode (Phase 2, Task 10) and
// page mode (Phase 3, Task 8).
//
//   pnpm build && pnpm start        # in another terminal; this script starts nothing itself
//   pnpm qa:visual                  # component mode; BASE_URL (default http://localhost:3000), QA_IDS=a,b filters ids
//   pnpm qa:visual:pages            # page mode (= node scripts/visual-compare.mjs --pages); QA_IDS filters
//                                   # page ids, QA_WIDTHS=390,1440 filters widths
//
// PAGE MODE (`--pages`). `references.json` > `pages["<id>"] = { route, name, screens: { "<width>": node } }`:
// full-page screenshots of `/<en><route>` at 1440 / 1024 / 768 / 390 (viewport height 900, deviceScaleFactor 1,
// reduced motion, page scrolled once so lazy images load, every image decoded before the shot, the fixed
// tab bar lands at the bottom of the full-page capture like the Figma frame) against
// `tests/visual/figma/pages/<id>-<width>.png` (Figma `get_screenshot` of the screen, scale 1). Same
// method as component mode: pad both images to the larger size, flatten on the page ground colour,
// pixelmatch threshold 0.1 without anti-aliasing. Output: `docs/QA/phase-3/<id>-<width>-{impl,figma,diff}.png`
// and `docs/QA/phase-3/results.md`. A report, not a gate; exit 1 only when a page cannot be loaded or a
// reference cannot be read. The component-mode notes below do not apply to page mode.
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
const PAGES_DIR = path.join(FIGMA_DIR, "pages");
const PAGES_OUT_DIR = path.join(ROOT, "docs", "QA", "phase-3");
const WIDTHS = [1440, 390];
const PAGE_WIDTHS = [1440, 1024, 768, 390];
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
 * Expands the `pages` section of references.json into one job per (page, width), widest first.
 * @param {Record<string, { route?: string, screens?: Record<string, string> }>} pages
 * @param {Set<string> | null} onlyIds page ids to keep, null for all
 * @param {Set<number> | null} [onlyWidths] widths to keep, null for all
 * @returns {{ id: string, width: number, key: string, route: string, node: string }[]}
 */
export function buildPageJobs(pages, onlyIds, onlyWidths = null) {
  const jobs = [];
  for (const [id, page] of Object.entries(pages)) {
    if (typeof page.route !== "string") {
      throw new Error(`page "${id}" has no route`);
    }
    if (onlyIds && !onlyIds.has(id)) continue;
    for (const width of PAGE_WIDTHS) {
      const node = page.screens?.[String(width)];
      if (!node || (onlyWidths && !onlyWidths.has(width))) continue;
      jobs.push({ id, width, key: `${id}-${width}`, route: page.route, node });
    }
  }
  return jobs;
}

const PAGE_LEGEND = [
  "Method: full-page screenshots of /en<route> in Playwright Chromium, viewport width = Figma frame width and height 900, deviceScaleFactor 1, reduced motion, animations disabled; the page is scrolled once so lazy images load and every image is decoded before the shot.",
  "Reference: Figma get_screenshot of the matching screen (scale 1, original size). Both images are padded to the larger size and flattened on the page background colour; pixelmatch threshold 0.1, anti-aliasing ignored.",
  'Notes: the height delta is implementation height minus Figma height; a non-zero delta shifts everything below it, so a high mismatch is expected and must be read from the triplet ("raw % is not pass/fail").',
];

/**
 * Markdown report of page mode.
 * @param {{ id: string, width: number, route: string, mismatch: string, impl: string, figma: string }[]} rows
 * @param {string[]} failures
 * @returns {string}
 */
export function formatPageResults(rows, failures) {
  const size = (value) => value.split("x").map(Number);
  const lines = [
    ...PAGE_LEGEND,
    "",
    "| id | route | width | mismatch % | impl WxH | figma WxH | height delta |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => {
      const delta = size(r.impl)[1] - size(r.figma)[1];
      const signed = delta > 0 ? `+${delta}` : String(delta);
      return `| ${r.id} | /${DEFAULT_LOCALE}${r.route} | ${r.width} | ${r.mismatch} | ${r.impl} | ${r.figma} | ${signed} |`;
    }),
  ];
  if (failures.length > 0) {
    lines.push("", "Failures:", "", ...failures.map((f) => `- ${f}`));
  }
  return lines.join("\n");
}

/**
 * Scrolls the whole page once (lazy images, in-view effects), then waits for every image to decode.
 * @param {import("@playwright/test").Page} page
 */
async function settlePage(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight / 2));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  const failed = await page.evaluate(async () => {
    const bad = [];
    await Promise.all(
      [...document.images].map(async (img) => {
        img.loading = "eager";
        const limit = new Promise((resolve) =>
          setTimeout(resolve, 15_000, "timeout"),
        );
        const outcome = await Promise.race([
          img.decode().then(
            () => "ok",
            () => "error",
          ),
          limit,
        ]);
        if (outcome !== "ok" || img.naturalWidth === 0) {
          bad.push(`${img.currentSrc || img.src} (${outcome})`);
        }
      }),
    );
    return bad;
  });
  if (failed.length > 0) {
    throw new Error(
      `image(s) not loaded before the shot: ${failed.join(", ")}`,
    );
  }
  // A full-page capture keeps `position: fixed` elements at the viewport bottom of the FIRST screen,
  // while a Figma frame draws the tab bar at the bottom of the whole screen. Re-anchor bottom-fixed
  // elements to the bottom of the document so both show the same thing.
  await page.evaluate(() => {
    const docHeight = document.documentElement.scrollHeight;
    for (const el of document.body.querySelectorAll("*")) {
      if (getComputedStyle(el).position !== "fixed") continue;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2) continue;
      el.style.position = "absolute";
      el.style.bottom = "auto";
      el.style.top = `${docHeight - (window.innerHeight - rect.top)}px`;
    }
  });
  await page.waitForTimeout(300);
}

async function mainPages() {
  const baseURL = (process.env.BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const csv = (value) =>
    value
      ? value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
  const onlyIds = csv(process.env.QA_IDS);
  const onlyWidths = csv(process.env.QA_WIDTHS);
  const manifest = await readJson(path.join(FIGMA_DIR, "references.json"), {});
  const jobs = buildPageJobs(
    manifest.pages ?? {},
    onlyIds ? new Set(onlyIds) : null,
    onlyWidths ? new Set(onlyWidths.map(Number)) : null,
  );
  if (jobs.length === 0) {
    console.error("No page references found for the selected ids/widths.");
    process.exitCode = 1;
    return;
  }

  await mkdir(PAGES_OUT_DIR, { recursive: true });
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const rows = [];
  const failures = [];

  try {
    for (const job of jobs) {
      const context = await browser.newContext({
        viewport: { width: job.width, height: VIEWPORT_HEIGHT },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      try {
        const figma = PNG.sync.read(
          await readFile(path.join(PAGES_DIR, `${job.key}.png`)),
        );
        const page = await context.newPage();
        const url = `${baseURL}/${DEFAULT_LOCALE}${job.route}`;
        const response = await page.goto(url, { waitUntil: "load" });
        if (!response || response.status() !== 200) {
          throw new Error(`GET ${url}: HTTP ${response?.status()}`);
        }
        await settlePage(page);
        const bg =
          parseCssColor(
            await page.evaluate(
              () => getComputedStyle(document.body).backgroundColor,
            ),
          ) ?? PAGE_BG_FALLBACK;
        const impl = PNG.sync.read(
          await page.screenshot({
            fullPage: true,
            animations: "disabled",
            caret: "hide",
          }),
        );

        const w = Math.max(impl.width, figma.width);
        const h = Math.max(impl.height, figma.height);
        const a = flattenOnto(impl, w, h, bg);
        const b = flattenOnto(figma, w, h, bg);
        const diff = new PNG({ width: w, height: h });
        const diffPixels = pixelmatch(a.data, b.data, diff.data, w, h, {
          threshold: 0.1,
          includeAA: false,
        });
        for (const [suffix, image] of [
          ["impl", a],
          ["figma", b],
          ["diff", diff],
        ]) {
          await writeFile(
            path.join(PAGES_OUT_DIR, `${job.key}-${suffix}.png`),
            PNG.sync.write(image),
          );
        }
        rows.push({
          id: job.id,
          width: job.width,
          route: job.route,
          mismatch: mismatchPercent(diffPixels, w, h).toFixed(2),
          impl: `${impl.width}x${impl.height}`,
          figma: `${figma.width}x${figma.height}`,
        });
      } catch (error) {
        failures.push(
          `${job.key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const table = formatPageResults(rows, failures);
  await writeFile(path.join(PAGES_OUT_DIR, "results.md"), `${table}\n`);
  console.log(table);
  if (failures.length > 0) process.exitCode = 1;
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
  await (process.argv.includes("--pages") ? mainPages() : main());
}
