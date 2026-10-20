// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "@/components/admin/ProductForm";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  publish: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/admin/actions", () => ({
  createProduct: vi.fn(),
  updateProduct: (...a: unknown[]) => mocks.update(...a),
  setProductPublished: (...a: unknown[]) => mocks.publish(...a),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/components/account/parts", () => ({ ProductImage: () => null }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const initial = {
  slug: "stone",
  nameRu: "Stone RU",
  nameEn: "Stone EN",
  descriptionRu: "",
  descriptionEn: "",
  material: "marble",
  color: "grey",
  colorGroup: "grey",
  finish: "honed",
  lengthMm: "600",
  widthMm: "300",
  thicknessMm: "20",
  price: "100",
  oldPrice: "",
  discountPercent: "",
  image: "images/catalog/grey-marble",
};
const options = {
  material: [],
  color: [],
  colorGroup: [],
  finish: [],
  image: [],
};
describe("Product editor conflict feedback", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const)
    it(`${locale}: keeps old revision paired with unsaved inputs after refreshed props and rejected saves`, async () => {
      const t = messages.admin.form;
      mocks.update
        .mockResolvedValueOnce({ ok: false, code: "conflict" })
        .mockRejectedValueOnce(new Error("private detail"));
      mocks.publish.mockResolvedValue({ ok: false, code: "conflict" });
      const view = renderWithIntl(
        <ProductForm
          mode="edit"
          initial={initial}
          published
          revision={4}
          options={options}
        />,
        locale,
      );
      const name = screen.getByLabelText(t.nameEn) as HTMLInputElement;
      fireEvent.change(name, { target: { value: "Unsaved name" } });
      view.rerender(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ProductForm
            mode="edit"
            initial={{ ...initial, nameEn: "Other admin's name" }}
            published
            revision={5}
            options={options}
          />
        </NextIntlClientProvider>,
      );
      for (const error of [t.errors.conflict, t.errors.generic]) {
        const button = screen.getByRole("button", {
          name: t.saveChanges,
        }) as HTMLButtonElement;
        await waitFor(() => expect(button.disabled).toBe(false));
        fireEvent.click(button);
        await waitFor(() =>
          expect(screen.getByRole("alert").textContent).toBe(error),
        );
        expect(name.value).toBe("Unsaved name");
        expect(mocks.update).toHaveBeenLastCalledWith(
          "stone",
          expect.objectContaining({
            nameEn: "Unsaved name",
            priceCents: 10000,
          }),
          4,
        );
      }
      const unpublish = screen.getByRole("button", {
        name: t.unpublish,
      }) as HTMLButtonElement;
      await waitFor(() => expect(unpublish.disabled).toBe(false));
      fireEvent.click(unpublish);
      await waitFor(() =>
        expect(mocks.publish).toHaveBeenCalledWith("stone", false, 4),
      );
      expect(mocks.push).not.toHaveBeenCalled();
      expect(mocks.refresh).not.toHaveBeenCalled();
    });
});
