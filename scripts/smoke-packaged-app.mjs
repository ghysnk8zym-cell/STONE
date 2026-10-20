import assert from "node:assert/strict";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

function localOrigin(target) {
  const url = new URL(target);
  assert(
    url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
    "Smoke target must be a plain HTTP loopback origin without credentials or path.",
  );
  return url;
}

/**
 * No credentials or dependencies: verifies the public packaged runtime.
 * @param {string} target
 * @param {{fetcher?: (url: URL, init?: RequestInit) => Promise<Response>}} [options]
 */
export async function smokePackagedApp(target, { fetcher = fetch } = {}) {
  const origin = localOrigin(target);
  async function request(path) {
    const url = new URL(path, origin);
    assert.equal(
      url.origin,
      origin.origin,
      "Asset/route must remain on loopback origin.",
    );
    return fetcher(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  }
  const health = await request("/api/health/db");
  assert.equal(
    health.status,
    503,
    "Smoke runtime must have no database credentials.",
  );
  assert.deepEqual(await health.json(), {
    ok: false,
    reason: "database-not-configured",
  });
  const assets = new Map();
  for (const locale of ["ru", "en"]) {
    const page = await request(`/${locale}`);
    assert.equal(page.status, 200, `${locale} page must load.`);
    assert.match(
      page.headers.get("content-type") ?? "",
      /text\/html/,
      "Page must be HTML.",
    );
    const indexing = page.headers.get("x-robots-tag") ?? "";
    assert.match(indexing, /\bnoindex\b/, "Demo must be noindex.");
    assert.match(indexing, /\bnofollow\b/, "Demo must be nofollow.");
    const html = await page.text();
    assert.match(
      html,
      new RegExp(`<html\\b[^>]*\\blang=["']${locale}["']`),
      "Page locale must match.",
    );
    const hrefs = [
      ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi),
    ].map((match) => match[1]);
    const css = hrefs.filter((href) =>
      new URL(href, origin).pathname.endsWith(".css"),
    );
    const fonts = hrefs.filter((href) =>
      /\.woff2?$/.test(new URL(href, origin).pathname),
    );
    assert(css.length > 0, "HTML must reference packaged CSS.");
    for (const href of css) assets.set(href, ["CSS", /text\/css/]);
    for (const href of fonts)
      assets.set(href, ["Font", /font\/|application\/(font|octet-stream)/]);
    const guard = await request(`/${locale}/admin`);
    assert(
      [303, 307, 308].includes(guard.status),
      "Guest admin must redirect.",
    );
    const location = new URL(guard.headers.get("location") ?? "", origin);
    assert.equal(
      location.origin,
      origin.origin,
      "Guest redirect must remain local.",
    );
    assert.equal(
      location.pathname,
      `/${locale}/sign-in`,
      "Guest redirect must preserve locale.",
    );
  }
  assets.set("/images/auth/create-account-landscape-1440.webp", [
    "Image",
    /image\/webp/,
  ]);
  let fontCount = 0;
  // Map iteration also visits font URLs discovered in each downloaded stylesheet.
  for (const [path, [kind, contentType]] of assets) {
    const asset = await request(path);
    assert.equal(asset.status, 200, `${kind} asset must load: ${path}`);
    assert.match(
      asset.headers.get("content-type") ?? "",
      contentType,
      `${kind} content type must match.`,
    );
    const bytes = await asset.arrayBuffer();
    assert(bytes.byteLength > 0, `${kind} asset must not be empty.`);
    if (kind === "Font") fontCount++;
    if (kind === "CSS") {
      const css = new TextDecoder().decode(bytes);
      for (const match of css.matchAll(
        /url\(\s*["']?([^\s"')]+)["']?\s*\)/gi,
      )) {
        const url = new URL(match[1], new URL(path, origin));
        if (/\.woff2?$/.test(url.pathname)) {
          assert.equal(
            url.origin,
            origin.origin,
            "Font must remain on loopback origin.",
          );
          assets.set(url.pathname + url.search, [
            "Font",
            /font\/|application\/(font|octet-stream)/,
          ]);
        }
      }
    }
  }
  assert(
    fontCount > 0,
    "Page must reference packaged fonts through HTML or CSS.",
  );
  return {
    locales: ["ru", "en"],
    assets: assets.size,
    database: "unconfigured",
    guestAdmin: "redirected",
  };
}

async function waitForRuntime(target) {
  const origin = localOrigin(target);
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/robots.txt", origin), {
        redirect: "manual",
        signal: AbortSignal.timeout(
          Math.min(2_000, Math.max(1, deadline - Date.now())),
        ),
      });
      await response.arrayBuffer();
      if (response.status === 200) return;
    } catch {
      // Startup can briefly refuse a connection; the bounded deadline still fails CI.
    }
    await delay(250);
  }
  throw new Error("Packaged runtime did not become ready within 60 seconds.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    assert.equal(
      process.argv.length,
      3,
      "Usage: node scripts/smoke-packaged-app.mjs <http-loopback-origin>",
    );
    const target = process.argv[2];
    await waitForRuntime(target);
    console.log(JSON.stringify(await smokePackagedApp(target)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
