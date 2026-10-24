// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { CartView } from "@/features/cart/CartView";
import { cart } from "@/features/cart/cart-store";
import {
  CART_STORAGE_KEY,
  type CartLine,
  type QuoteResult,
} from "@/features/cart/input";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

const mocks = vi.hoisted(() => ({ quote: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("@/server/shop/actions", () => ({
  quoteCart: (...args: unknown[]) => mocks.quote(...args),
}));
vi.mock("next/image", () => ({ default: () => <span /> }));

const initial = [{ slug: "black-marble", areaHundredths: 220 }];
function quote(lines: CartLine[], locale = "en"): QuoteResult {
  return {
    ok: true,
    quote: {
      lines: lines.map((line) => ({
        ...line,
        available: true,
        name: `${locale}:${line.slug}`,
        material: "marble",
        finish: "polished",
        image: "images/catalog/black-marble",
        imageFit: "contain",
        priceCents: 24000,
        isPlaceholder: true,
        lineTotalCents: line.areaHundredths * 240,
      })),
      totalCents: lines.reduce(
        (sum, line) => sum + line.areaHundredths * 240,
        0,
      ),
      tooLarge: false,
      orderable: lines.length > 0,
    },
  };
}
function view(locale: "en" | "ru" = "en") {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : ru}
    >
      <CartView locale={locale} />
    </NextIntlClientProvider>
  );
}
function external(lines: CartLine[]) {
  act(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    window.dispatchEvent(
      new StorageEvent("storage", { key: CART_STORAGE_KEY }),
    );
  });
}
function field() {
  return screen.getAllByRole("textbox")[0] as HTMLInputElement;
}
async function total(value: string) {
  await waitFor(() =>
    expect(screen.getByTestId("cart-total").textContent).toBe(value),
  );
}
beforeEach(() => {
  localStorage.clear();
  cart.clear();
  mocks.quote.mockReset();
  mocks.quote.mockImplementation(async (lines: CartLine[], locale: string) =>
    quote(lines, locale),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps acknowledged additions when writes fail but reads work", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
  expect(cart.add(initial[0])).toBe("added");
  expect(cart.lines()).toEqual(initial);
  expect(cart.add(initial[0])).toBe("added");
  expect(cart.lines()[0].areaHundredths).toBe(440);
});
it("can update, remove and clear an existing cart after a write failure", () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  cart.setArea("black-marble", 990);
  expect(cart.lines()[0].areaHundredths).toBe(990);
  cart.remove("black-marble");
  expect(cart.lines()).toEqual([]);
  cart.add(initial[0]);
  cart.clear();
  expect(cart.lines()).toEqual([]);
});
it("uses memory when reads and writes are blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  cart.add(initial[0]);
  expect(cart.lines()).toEqual(initial);
});
it("retains the last successful read if later reads fail", () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  expect(cart.lines()).toEqual(initial);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(cart.lines()).toEqual(initial);
});
it("persists the memory cart when a later write succeeds", () => {
  const writes = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("quota");
    });
  cart.add(initial[0]);
  writes.mockRestore();
  cart.add(initial[0]);
  expect(
    JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)[0].areaHundredths,
  ).toBe(440);
});
it("keeps the displayed area in sync with another tab's quoted area", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  const { render } = await import("@testing-library/react");
  render(view());
  await total("$528.00");
  external([{ slug: "black-marble", areaHundredths: 990 }]);
  await total("$2,376.00");
  expect(field().value).toBe("9.90");
});
it("clears a local invalid draft and its blocking state when another tab changes the area", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  const { render } = await import("@testing-library/react");
  render(view());
  await total("$528.00");
  fireEvent.change(field(), { target: { value: "0" } });
  fireEvent.blur(field());
  expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();
  external([{ slug: "black-marble", areaHundredths: 990 }]);
  await total("$2,376.00");
  expect(field().value).toBe("9.90");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("link", { name: "Checkout" })).toBeTruthy();
});
it("unblocks remaining lines when another tab removes an invalid row", async () => {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify([...initial, { slug: "grey-marble", areaHundredths: 100 }]),
  );
  const { render } = await import("@testing-library/react");
  render(view());
  await total("$768.00");
  fireEvent.change(field(), { target: { value: "0" } });
  fireEvent.blur(field());
  external([{ slug: "grey-marble", areaHundredths: 100 }]);
  await total("$240.00");
  expect(screen.getByRole("link", { name: "Checkout" })).toBeTruthy();
});
it("does not retain validation from an externally removed and re-added row", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  const { render } = await import("@testing-library/react");
  render(view());
  await total("$528.00");
  fireEvent.change(field(), { target: { value: "0" } });
  fireEvent.blur(field());
  external([]);
  expect(screen.getByText(en.cart.empty.title)).toBeTruthy();
  external(initial);
  await total("$528.00");
  expect(field().value).toBe("2.20");
  expect(screen.getByRole("link", { name: "Checkout" })).toBeTruthy();
});
it("preserves local decimal text and incomplete invalid input during re-renders", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  const { render } = await import("@testing-library/react");
  const ui = render(view());
  await total("$528.00");
  fireEvent.change(field(), { target: { value: "2,50" } });
  await total("$600.00");
  expect(field().value).toBe("2,50");
  fireEvent.change(field(), { target: { value: "abc" } });
  ui.rerender(view());
  expect(field().value).toBe("abc");
  expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();
});
it("blocks checkout while a replacement quote is pending", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  const { render } = await import("@testing-library/react");
  render(view());
  await total("$528.00");
  mocks.quote.mockImplementation(() => new Promise(() => {}));
  fireEvent.change(field(), { target: { value: "3" } });
  expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Checkout" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("reformats the field and waits for the new locale's quote", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  const { render } = await import("@testing-library/react");
  const ui = render(view());
  await total("$528.00");
  let resolve!: (result: QuoteResult) => void;
  mocks.quote.mockImplementation(
    () =>
      new Promise<QuoteResult>((done) => {
        resolve = done;
      }),
  );
  ui.rerender(view("ru"));
  expect(field().value).toBe("2,20");
  expect(screen.queryByRole("link", { name: ru.cart.checkout })).toBeNull();
  await waitFor(() => expect(mocks.quote).toHaveBeenCalledWith(initial, "ru"));
  await act(async () => resolve(quote(initial, "ru")));
  expect(screen.getByRole("link", { name: ru.cart.checkout })).toBeTruthy();
  expect(screen.getByText("ru:black-marble")).toBeTruthy();
});
it("shows a quote error and recovers after the next valid edit", async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
  mocks.quote.mockRejectedValueOnce(new Error("offline"));
  const { render } = await import("@testing-library/react");
  render(view());
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.change(field(), { target: { value: "3" } });
  await total("$720.00");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("link", { name: "Checkout" })).toBeTruthy();
});
