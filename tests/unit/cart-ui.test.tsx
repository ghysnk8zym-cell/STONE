// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Calculator } from "@/app/[locale]/(site)/catalog/[slug]/Calculator";
import { TestBanner } from "@/components/navigation/TestBanner";
import { CartView } from "@/features/cart/CartView";
import { CheckoutView } from "@/features/cart/CheckoutView";
import { CART_STORAGE_KEY, type Quote } from "@/features/cart/input";

import { renderWithIntl } from "./render";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  quote: vi.fn(),
  place: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  useRouter: () => ({ push: mocks.push, replace: mocks.push }),
}));
vi.mock("@/server/shop/actions", () => ({
  quoteCart: (...args: unknown[]) => mocks.quote(...args),
  placeTestOrder: (...args: unknown[]) => mocks.place(...args),
}));
vi.mock("next/image", () => ({
  default: () => <span data-testid="product-image" />,
}));

const stored = () =>
  JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]") as unknown;

function quoteFor(
  lines: { slug: string; areaHundredths: number }[],
  price = 24000,
  unavailable: string[] = [],
): Quote {
  const quoted = lines.map((l) =>
    unavailable.includes(l.slug)
      ? { ...l, available: false as const }
      : {
          ...l,
          available: true as const,
          name: null,
          material: "marble",
          finish: "polished",
          image: "images/catalog/black-marble",
          imageFit: "contain" as const,
          priceCents: price,
          isPlaceholder: true,
          lineTotalCents: Math.round((l.areaHundredths * price) / 100),
        },
  );
  return {
    lines: quoted,
    totalCents: quoted.reduce(
      (s, l) => s + (l.available ? l.lineTotalCents : 0),
      0,
    ),
    tooLarge: false,
    orderable: quoted.length > 0 && quoted.every((l) => l.available),
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.push.mockReset();
  mocks.place.mockReset();
  mocks.quote.mockReset();
  mocks.quote.mockImplementation(async (items) => ({
    ok: true,
    quote: quoteFor(items as never),
  }));
});
afterEach(cleanup);

describe("product page: Add to cart / Buy now", () => {
  it("adds the calculator's order area, and adding again adds it up", () => {
    renderWithIntl(
      <Calculator unitCents={24000} isPlaceholder slug="black-marble" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(stored()).toEqual([{ slug: "black-marble", areaHundredths: 220 }]);
    expect(screen.getByRole("status").textContent).toContain("2.20");
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(stored()).toEqual([{ slug: "black-marble", areaHundredths: 440 }]);
  });

  it("refuses an order area above 10 000 m² (9 091 m² + 10 %) with a clear message", () => {
    renderWithIntl(
      <Calculator unitCents={24000} isPlaceholder slug="black-marble" />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "9091" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buy now" }));
    expect(stored()).toEqual([]);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "One product can be ordered up to 10,000 m². Reduce the area.",
    );
  });

  it("refuses an add that would take the line above 10 000 m², keeping the line as it was", () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 999_900 }]),
    );
    renderWithIntl(
      <Calculator unitCents={24000} isPlaceholder slug="black-marble" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(stored()).toEqual([
      { slug: "black-marble", areaHundredths: 999_900 },
    ]);
    expect(screen.getByRole("status").textContent).toContain("10,000 m²");
  });

  it("Buy now adds and opens the cart", () => {
    renderWithIntl(
      <Calculator unitCents={24000} isPlaceholder slug="black-marble" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Buy now" }));
    expect(stored()).toEqual([{ slug: "black-marble", areaHundredths: 220 }]);
    expect(mocks.push).toHaveBeenCalledWith("/cart");
  });

  it("disables both while the calculator input is invalid", () => {
    renderWithIntl(
      <Calculator unitCents={24000} isPlaceholder slug="black-marble" />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    for (const name of ["Buy now", "Add to cart"])
      expect(
        (screen.getByRole("button", { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
  });
});

describe("cart page", () => {
  it("shows the empty state with a catalog link", async () => {
    renderWithIntl(<CartView locale="en" />);
    expect(
      await screen.findByRole("heading", { name: "Your cart is empty" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open catalog" }).getAttribute("href"),
    ).toBe("/catalog");
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it("lists the lines with server prices, the total and the indicative-price note", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 220 }]),
    );
    renderWithIntl(<CartView locale="en" />);
    expect(await screen.findByText("Black Marble")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("cart-total").textContent).toBe("$528.00"),
    );
    expect(screen.getByText("Prices are indicative")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Checkout" }).getAttribute("href"),
    ).toBe("/checkout");
  });

  it("edits the area with comma or dot, shows the calculator error for invalid input and blocks checkout", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 220 }]),
    );
    renderWithIntl(<CartView locale="en" />);
    const field = await screen.findByRole("textbox", { name: /Area/ });
    fireEvent.change(field, { target: { value: "3,5" } });
    fireEvent.blur(field);
    await waitFor(() =>
      expect(stored()).toEqual([{ slug: "black-marble", areaHundredths: 350 }]),
    );
    fireEvent.change(field, { target: { value: "abc" } });
    fireEvent.blur(field);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Enter a number",
    );
    expect(stored()).toEqual([{ slug: "black-marble", areaHundredths: 350 }]);
    expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();
    fireEvent.change(field, { target: { value: "20000" } });
    fireEvent.blur(field);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "from 0.01 to 10,000",
    );
  });

  it("removes a line", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 220 }]),
    );
    renderWithIntl(<CartView locale="en" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove Black Marble" }),
    );
    expect(stored()).toEqual([]);
    expect(
      await screen.findByRole("heading", { name: "Your cart is empty" }),
    ).toBeTruthy();
  });

  it("flags an unavailable product and blocks checkout until it is removed", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 220 }]),
    );
    mocks.quote.mockImplementation(async (items) => ({
      ok: true,
      quote: quoteFor(items as never, 24000, ["black-marble"]),
    }));
    renderWithIntl(<CartView locale="en" />);
    expect(
      await screen.findByText("No longer available. Remove it to continue."),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();
  });
});

describe("cart page: totals above what an order can store", () => {
  it("explains and blocks checkout", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 1_000_000 }]),
    );
    mocks.quote.mockImplementation(async (items) => ({
      ok: true,
      quote: {
        ...quoteFor(items as never, 300_000),
        tooLarge: true,
        orderable: false,
      },
    }));
    renderWithIntl(<CartView locale="en" />);
    expect(
      await screen.findByText(
        "This order is too large for the test shop. Reduce the areas.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();
  });
});

describe("checkout", () => {
  const seed = () =>
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ slug: "black-marble", areaHundredths: 220 }]),
    );

  it("places the order with a per-attempt key, clears the cart and opens the order page", async () => {
    seed();
    let resolve!: (v: unknown) => void;
    mocks.place.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithIntl(<CheckoutView locale="en" />);
    expect(
      await screen.findByText(
        "Test order: no payment is taken and nothing is delivered.",
      ),
    ).toBeTruthy();
    const button = await screen.findByRole("button", {
      name: "Place test order",
    });
    await waitFor(() =>
      expect(screen.getByTestId("checkout-total").textContent).toBe("$528.00"),
    );
    fireEvent.click(button);
    await waitFor(() => expect(mocks.place).toHaveBeenCalledTimes(1));
    const [input] = mocks.place.mock.calls[0] as [
      { key: string; expectedTotalCents: number; items: unknown },
    ];
    expect(input.expectedTotalCents).toBe(52800);
    expect(input.items).toEqual([
      { slug: "black-marble", areaHundredths: 220 },
    ]);
    expect(input.key).toMatch(/^[0-9a-f-]{36}$/);
    // pending: a second click does nothing
    fireEvent.click(screen.getByRole("button", { name: /Place test order/ }));
    expect(mocks.place).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, number: "T-2001" }));
    expect(mocks.push).toHaveBeenCalledWith("/account/orders/T-2001?placed=1");
    expect(stored()).toEqual([]);
  });

  it("reuses the same key for a retry after a lost response", async () => {
    seed();
    mocks.place.mockRejectedValueOnce(new Error("network"));
    mocks.place.mockResolvedValueOnce({ ok: true, number: "T-2001" });
    renderWithIntl(<CheckoutView locale="en" />);
    await waitFor(() =>
      expect(screen.getByTestId("checkout-total").textContent).toBe("$528.00"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Place test order" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Place test order" }));
    await waitFor(() => expect(mocks.place).toHaveBeenCalledTimes(2));
    const keys = mocks.place.mock.calls.map(
      ([input]) => (input as { key: string }).key,
    );
    expect(keys[1]).toBe(keys[0]);
  });

  it("on prices_changed shows the new total and asks for a second confirmation", async () => {
    seed();
    const fresh = quoteFor(
      [{ slug: "black-marble", areaHundredths: 220 }],
      25000,
    );
    mocks.place.mockResolvedValueOnce({
      ok: false,
      code: "prices_changed",
      quote: fresh,
    });
    mocks.place.mockResolvedValueOnce({ ok: true, number: "T-2002" });
    renderWithIntl(<CheckoutView locale="en" />);
    await waitFor(() =>
      expect(screen.getByTestId("checkout-total").textContent).toBe("$528.00"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Place test order" }));
    expect(
      await screen.findByText(
        "Prices have changed. Check the new total and confirm again.",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("checkout-total").textContent).toBe("$550.00");
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm the new total" }),
    );
    await waitFor(() => expect(mocks.place).toHaveBeenCalledTimes(2));
    expect(
      (mocks.place.mock.calls[1]![0] as { expectedTotalCents: number })
        .expectedTotalCents,
    ).toBe(55000);
  });

  it("shows the localised error and the empty state", async () => {
    seed();
    mocks.place.mockResolvedValueOnce({ ok: false, code: "limit" });
    renderWithIntl(<CheckoutView locale="ru" />, "ru");
    const button = await screen.findByRole("button", {
      name: "Оформить тестовый заказ",
    });
    await waitFor(() =>
      expect(screen.getByTestId("checkout-total").textContent).toContain("528"),
    );
    fireEvent.click(button);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Для этого аккаунта достигнут лимит тестовых заказов.",
    );
    cleanup();
    localStorage.clear();
    renderWithIntl(<CheckoutView locale="en" />);
    expect(
      await screen.findByRole("heading", { name: "Nothing to order" }),
    ).toBeTruthy();
  });
});

describe("test banner", () => {
  it("is a plain, non-dismissible localised notice", () => {
    renderWithIntl(<TestBanner />, "ru");
    const banner = screen.getByRole("note");
    expect(banner.textContent).toBe(
      "Тестовая версия: заказы не оплачиваются и не доставляются",
    );
    expect(banner.querySelector("button")).toBeNull();
  });
});
