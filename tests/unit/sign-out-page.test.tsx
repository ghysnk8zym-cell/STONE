import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { redirectTarget, thrown } from "./auth-helpers";

vi.mock("server-only", () => ({}));
const lookup = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth/session", () => ({ getSession: lookup }));
vi.mock("@/app/[locale]/(auth)/actions", () => ({ signOutAction: vi.fn() }));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => (key: string) => key,
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/buttons/Button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));

const { default: SignOutPage } =
  await import("@/app/[locale]/(site)/sign-out/page");
const props = (error?: string) => ({
  params: Promise.resolve({ locale: "en" }),
  searchParams: Promise.resolve(error ? { error } : {}),
});
afterEach(() => vi.restoreAllMocks());

describe("sign-out confirmation failure states", () => {
  it("redirects a verified guest home", async () => {
    lookup.mockResolvedValue(null);
    expect(redirectTarget(await thrown(() => SignOutPage(props())))).toBe(
      "/en",
    );
  });

  it("keeps a retryable alert when session lookup is unavailable", async () => {
    lookup.mockRejectedValue(new Error("synthetic lookup failure"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToStaticMarkup(await SignOutPage(props()));
    expect(html).toContain('role="alert"');
    expect(html).toContain("errors.unavailable");
    expect(html).toContain("<form");
  });

  it("preserves a failed-action alert when no database returns a null session", async () => {
    lookup.mockResolvedValue(null);
    const html = renderToStaticMarkup(await SignOutPage(props("unavailable")));
    expect(html).toContain("errors.unavailable");
  });

  it("never reflects an arbitrary query error", async () => {
    lookup.mockResolvedValue({ user: { id: "fixture" } });
    const html = renderToStaticMarkup(
      await SignOutPage(props("untrusted-fixture-value")),
    );
    expect(html).not.toContain("untrusted-fixture-value");
    expect(html).not.toContain('role="alert"');
  });
});
