// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ProductFormValues } from "@/components/admin/product-form-values";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

/*
 * Final review I1: a server action that THROWS (a Neon wake-up timeout, a 5xx) must not reach React's error boundary
 * from the admin forms: the form shows the generic message and keeps what was typed.
 */
const mocks = vi.hoisted(() => ({ fail: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));
// next/image needs the app's image loader (a manifest key), which does not run under Vitest.
vi.mock("@/components/account/parts", () => ({ ProductImage: () => null }));
vi.mock("@/server/admin/actions", () => ({
  createProduct: (...args: unknown[]) => mocks.fail(...args),
  updateProduct: (...args: unknown[]) => mocks.fail(...args),
  setProductPublished: (...args: unknown[]) => mocks.fail(...args),
  setOrderStatus: (...args: unknown[]) => mocks.fail(...args),
}));

afterEach(() => {
  cleanup();
  mocks.fail.mockReset();
});

const initial: ProductFormValues = {
  slug: "new-stone",
  nameRu: "Новый камень",
  nameEn: "New stone",
  descriptionRu: "",
  descriptionEn: "",
  material: "marble",
  color: "grey",
  colorGroup: "grey",
  finish: "honed",
  lengthMm: "600",
  widthMm: "300",
  thicknessMm: "20",
  price: "240",
  oldPrice: "",
  discountPercent: "",
  image: "images/catalog/grey-marble",
};

const options: ComponentProps<typeof ProductForm>["options"] = {
  material: [{ value: "marble", label: "Marble" }],
  color: [{ value: "grey", label: "Grey" }],
  colorGroup: [{ value: "grey", label: "Grey" }],
  finish: [{ value: "honed", label: "Honed" }],
  image: [
    {
      value: "images/catalog/grey-marble",
      label: "Grey Marble",
      fit: "contain",
    },
  ],
};

describe("admin forms survive a failing server action", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    it(`${locale}: the product form shows the generic error and keeps the typed values`, async () => {
      mocks.fail.mockRejectedValue(new Error("boom"));
      renderWithIntl(
        <ProductForm mode="create" initial={initial} options={options} />,
        locale,
      );
      const t = messages.admin.form;
      const field = screen.getByLabelText(t.nameEn, { exact: true });
      fireEvent.change(field, { target: { value: "Typed name" } });
      fireEvent.click(screen.getByRole("button", { name: t.publish }));

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(t.errors.generic);
      expect(mocks.fail).toHaveBeenCalledTimes(1);
      expect((field as HTMLInputElement).value).toBe("Typed name");
      // and the buttons work again (not stuck in the pending state)
      await waitFor(() =>
        expect(
          (screen.getByRole("button", { name: t.publish }) as HTMLButtonElement)
            .disabled,
        ).toBe(false),
      );
    });

    it(`${locale}: unpublishing shows the generic error too`, async () => {
      mocks.fail.mockRejectedValue(new Error("boom"));
      renderWithIntl(
        <ProductForm
          mode="edit"
          published
          initial={initial}
          options={options}
        />,
        locale,
      );
      const t = messages.admin.form;
      fireEvent.click(screen.getByRole("button", { name: t.unpublish }));
      expect((await screen.findByRole("alert")).textContent).toBe(
        t.errors.generic,
      );
    });

    it(`${locale}: the order status form shows the generic error and keeps the chosen status`, async () => {
      mocks.fail.mockRejectedValue(new Error("boom"));
      renderWithIntl(
        <OrderStatusForm number="D-1" status="in_progress" />,
        locale,
      );
      const t = messages.admin.orders.detail;
      const select = screen.getByLabelText(t.fulfillment, {
        exact: true,
      }) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "delivered" } });
      fireEvent.click(screen.getByRole("button", { name: t.update }));

      expect((await screen.findByRole("alert")).textContent).toBe(
        t.errors.generic,
      );
      expect(select.value).toBe("delivered");
    });
  }
});
