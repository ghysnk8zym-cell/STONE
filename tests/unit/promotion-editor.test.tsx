// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PromotionEditor } from "@/components/admin/PromotionEditor";
import type { PromotionProduct } from "@/server/admin/promotion-queries";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("@/server/admin/actions", () => ({
  setProductPromotion: (...args: unknown[]) => mocks.save(...args),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
vi.mock("@/components/account/parts", () => ({ ProductImage: () => null }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const product: PromotionProduct = {
  slug: "test",
  name: "Test",
  material: "marble",
  formatMm: [600, 300, 20],
  image: "images/catalog/black-marble",
  imageFit: "contain",
  published: true,
  revision: 0,
  priceCents: 10000,
  oldPriceCents: null,
  discountPercent: null,
};
const baseline = {
  revision: 0,
  priceCents: 10000,
  oldPriceCents: null,
  discountPercent: null,
};

describe("Promotions editor", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    const t = messages.admin.promotions;
    const form = messages.admin.form;
    const render = () =>
      renderWithIntl(
        <PromotionEditor
          product={product}
          options={[{ value: "test", label: "Test" }]}
        />,
        locale,
      );
    it(`${locale}: preserves inputs on a conflict or database exception`, async () => {
      mocks.save
        .mockResolvedValueOnce({ ok: false, code: "conflict" })
        .mockRejectedValueOnce(new Error("private database detail"));
      render();
      const price = screen.getByLabelText(form.pricePerM2) as HTMLInputElement;
      fireEvent.change(price, { target: { value: "80" } });
      for (const error of [t.errors.conflict, t.errors.generic]) {
        const button = screen.getByRole("button", {
          name: t.save,
        }) as HTMLButtonElement;
        await waitFor(() => expect(button.disabled).toBe(false));
        fireEvent.click(button);
        await waitFor(() =>
          expect(screen.getByRole("alert").textContent).toBe(error),
        );
        expect(price.value).toBe("80");
      }
      expect(mocks.refresh).not.toHaveBeenCalled();
    });
    it(`${locale}: rejects unreadable decimals without turning them into zero`, async () => {
      render();
      fireEvent.change(screen.getByLabelText(form.pricePerM2), {
        target: { value: "80.123" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.save }));
      expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
      expect(mocks.save).not.toHaveBeenCalled();
    });
    it(`${locale}: saves null/zero accurately and uses the saved baseline on the next edit`, async () => {
      const saved = { priceCents: 0, oldPriceCents: null, discountPercent: 0 };
      mocks.save.mockResolvedValue({
        ok: true,
        prices: { ...saved, revision: 1 },
      });
      render();
      fireEvent.change(screen.getByLabelText(form.pricePerM2), {
        target: { value: "0" },
      });
      fireEvent.change(screen.getByLabelText(form.discount), {
        target: { value: "0" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.save }));
      expect((await screen.findByRole("status")).textContent).toBe(t.saved);
      expect(mocks.save).toHaveBeenLastCalledWith("test", saved, baseline);
      fireEvent.change(screen.getByLabelText(form.pricePerM2), {
        target: { value: "1" },
      });
      const button = screen.getByRole("button", {
        name: t.save,
      }) as HTMLButtonElement;
      await waitFor(() => expect(button.disabled).toBe(false));
      fireEvent.click(button);
      await waitFor(() =>
        expect(mocks.save).toHaveBeenLastCalledWith(
          "test",
          { ...saved, priceCents: 100 },
          { ...saved, revision: 1 },
        ),
      );
    });
  }
});
