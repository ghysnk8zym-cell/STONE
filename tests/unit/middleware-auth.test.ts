import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import middleware from "@/middleware";
import {
  REQUEST_PATH_HEADER,
  SESSION_COOKIE_NAMES,
} from "@/server/auth/constants";

// The middleware check is optimistic (cookie presence only); the guards are the boundary.
function request(
  path: string,
  init: { cookie?: string; headers?: Record<string, string> } = {},
) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

function signInRedirect(response: Response) {
  const location = response.headers.get("location");
  if (!location) return null;
  const url = new URL(location);
  return url.pathname.endsWith("/sign-in")
    ? { pathname: url.pathname, next: url.searchParams.get("next") }
    : null;
}

describe("middleware auth redirect", () => {
  it.each([
    ["/ru/account", "/ru/sign-in", "/ru/account"],
    ["/en/account/orders", "/en/sign-in", "/en/account/orders"],
    ["/en/admin", "/en/sign-in", "/en/admin"],
    ["/ru/admin/products?page=2", "/ru/sign-in", "/ru/admin/products?page=2"],
  ])(
    "cookie absent: %s redirects to sign-in with next",
    (path, pathname, next) => {
      const response = middleware(request(path));
      expect(response.status).toBe(307);
      expect(signInRedirect(response)).toEqual({ pathname, next });
    },
  );

  it.each(SESSION_COOKIE_NAMES)(
    "cookie %s present: the request passes",
    (name) => {
      const response = middleware(
        request("/ru/account", { cookie: `${name}=opaque` }),
      );
      expect(signInRedirect(response)).toBeNull();
    },
  );

  it("an empty session cookie counts as absent", () => {
    const name = SESSION_COOKIE_NAMES[0]!;
    const response = middleware(request("/ru/account", { cookie: `${name}=` }));
    expect(signInRedirect(response)?.next).toBe("/ru/account");
  });

  it("leaves public pages and look-alike paths alone", () => {
    for (const path of [
      "/ru",
      "/ru/catalog",
      "/en/accounting",
      "/ru/administrator",
    ]) {
      expect(signInRedirect(middleware(request(path))), path).toBeNull();
    }
  });

  it("never builds an external next from a crafted path", () => {
    const response = middleware(request("/ru/account//evil.com"));
    const next = signInRedirect(response)?.next ?? "";
    expect(new URL(next, "https://stone.example").origin).toBe(
      "https://stone.example",
    );
    expect(next.startsWith("/ru/")).toBe(true);
  });

  it("forwards the sanitised request path to the guards and overrides a client value", () => {
    const response = middleware(
      request("/ru/catalog?q=x", {
        headers: { [REQUEST_PATH_HEADER]: "//evil.com" },
      }),
    );
    expect(
      response.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`),
    ).toBe("/ru/catalog?q=x");
  });
});
