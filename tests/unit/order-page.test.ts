import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async () => (key: string, values?: { number: string }) =>
    `${key}:${values?.number ?? ""}`,
}));
vi.mock("@/server/auth/guards", () => ({ requireUser: vi.fn() }));
vi.mock("@/server/shop/queries", () => ({ getOwnOrder: vi.fn() }));

const { generateMetadata } =
  await import("@/app/[locale]/(site)/account/orders/[number]/page");
const props = (number: string) =>
  ({
    params: Promise.resolve({ locale: "en", number }),
    searchParams: Promise.resolve({}),
  }) as never;

describe("order page metadata", () => {
  it("names the order", async () => {
    expect((await generateMetadata(props("T-2001"))).title).toBe("meta:T-2001");
  });

  it("does not throw on a malformed percent-encoding", async () => {
    await expect(generateMetadata(props("%E0%A4%A"))).resolves.toMatchObject({
      title: "meta:%E0%A4%A",
    });
  });
});
