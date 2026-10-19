import { describe, expect, it, vi } from "vitest";

import { smokePackagedApp } from "../../scripts/smoke-packaged-app.mjs";

function fixture(change?: (path: string, response: Response) => Response) {
  return vi.fn(async (url: URL) => {
    const path = url.pathname;
    let response: Response;
    if (path === "/api/health/db") {
      response = Response.json(
        { ok: false, reason: "database-not-configured" },
        { status: 503 },
      );
    } else if (/^\/(ru|en)\/admin$/.test(path)) {
      response = new Response(null, {
        status: 307,
        headers: { location: `${path.slice(0, 3)}/sign-in` },
      });
    } else if (/^\/(ru|en)$/.test(path)) {
      response = new Response(
        `<html lang="${path.slice(1)}"><link href="/_next/static/main.css"><link href="/_next/static/font.woff2"></html>`,
        {
          headers: {
            "content-type": "text/html",
            "x-robots-tag": "noindex, nofollow",
          },
        },
      );
    } else if (path.endsWith(".css")) {
      response = new Response("body{color:black}", {
        headers: { "content-type": "text/css" },
      });
    } else if (path.endsWith(".woff2")) {
      response = new Response("font", {
        headers: { "content-type": "font/woff2" },
      });
    } else {
      response = new Response("image", {
        headers: { "content-type": "image/webp" },
      });
    }
    return change?.(path, response) ?? response;
  });
}

describe("packaged app smoke", () => {
  it("follows stylesheet font URLs when Next does not emit HTML font preload tags", async () => {
    const fetcher = fixture((path, response) => {
      if (/^\/(ru|en)$/.test(path))
        return new Response(
          `<html lang="${path.slice(1)}"><link href="/_next/static/main.css"></html>`,
          { headers: response.headers },
        );
      if (path.endsWith(".css"))
        return new Response("@font-face{src:url(./font.woff2)}", {
          headers: response.headers,
        });
      return response;
    });
    await expect(
      smokePackagedApp("http://localhost:3100", { fetcher }),
    ).resolves.toMatchObject({ assets: 3 });
  });

  it("checks both locales, packaged assets, no-database mode and guest guards", async () => {
    const fetcher = fixture();
    const result = await smokePackagedApp("http://127.0.0.1:3100", { fetcher });
    expect(result.locales).toEqual(["ru", "en"]);
    expect(result.assets).toBe(3);
    expect(
      fetcher.mock.calls.every(
        ([url]) => url.origin === "http://127.0.0.1:3100",
      ),
    ).toBe(true);
  });

  it.each([
    "https://example.com",
    "http://localhost.evil.test",
    "http://127.0.0.1/private",
    "http://user:password@localhost",
  ])(
    "refuses a nonlocal or ambiguous target before making requests: %s",
    async (target) => {
      const fetcher = fixture();
      await expect(smokePackagedApp(target, { fetcher })).rejects.toThrow(
        "loopback",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("fails when an asset is missing, rather than accepting a successful HTML fallback", async () => {
    const fetcher = fixture((path, response) =>
      path.endsWith(".css")
        ? new Response("<html>fallback</html>", {
            headers: { "content-type": "text/html" },
          })
        : response,
    );
    await expect(
      smokePackagedApp("http://localhost:3100", { fetcher }),
    ).rejects.toThrow("CSS");
  });

  it.each(["locale", "indexing", "database", "guard", "external-asset"])(
    "rejects a broken %s invariant",
    async (kind) => {
      const fetcher = fixture((path, response) => {
        if (kind === "locale" && path === "/en")
          return new Response('<html lang="ru"></html>', {
            headers: response.headers,
          });
        if (kind === "indexing" && path === "/en")
          return new Response('<html lang="en"></html>', {
            headers: { "content-type": "text/html" },
          });
        if (kind === "database" && path === "/api/health/db")
          return Response.json({ ok: true });
        if (kind === "guard" && path === "/ru/admin")
          return new Response("admin");
        if (kind === "external-asset" && path === "/ru")
          return new Response(
            '<html lang="ru"><link href="https://example.com/style.css"><link href="/_next/static/font.woff2"></html>',
            { headers: response.headers },
          );
        return response;
      });
      await expect(
        smokePackagedApp("http://localhost:3100", { fetcher }),
      ).rejects.toThrow();
      expect(
        fetcher.mock.calls.every(([url]) => url.hostname === "localhost"),
      ).toBe(true);
    },
  );
});
