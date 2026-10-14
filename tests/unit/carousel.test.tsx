// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Carousel } from "@/components/carousel/Carousel";

import { renderWithIntl } from "./render";

const scrollBy = vi.fn();

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  scrollBy.mockReset();
  Element.prototype.scrollBy =
    scrollBy as unknown as typeof Element.prototype.scrollBy;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  mockReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function button(name: string) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

const off = (name: string) =>
  button(name).getAttribute("aria-disabled") === "true";

function setup() {
  renderWithIntl(
    <Carousel label="Catalog">
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </Carousel>,
  );
  const list = screen.getByRole("list").parentElement as HTMLElement;
  // jsdom has no layout: a 300 px viewport over a 900 px track, items 280 px wide
  Object.defineProperty(list, "clientWidth", {
    value: 300,
    configurable: true,
  });
  Object.defineProperty(list, "scrollWidth", {
    value: 900,
    configurable: true,
  });
  for (const li of screen.getByRole("list").querySelectorAll("li")) {
    Object.defineProperty(li, "offsetWidth", {
      value: 280,
      configurable: true,
    });
  }
  return list;
}

describe("Carousel", () => {
  it("disables prev at start", () => {
    const list = setup();
    fireEvent.scroll(list);
    expect(off("Previous")).toBe(true);
    expect(off("Next")).toBe(false);
  });

  it("disables next at the end and enables prev away from the start", () => {
    const list = setup();
    list.scrollLeft = 600;
    fireEvent.scroll(list);
    expect(off("Previous")).toBe(false);
    expect(off("Next")).toBe(true);
  });

  it("next scrolls by one item smoothly", () => {
    const list = setup();
    fireEvent.scroll(list);
    fireEvent.click(button("Next"));
    expect(scrollBy).toHaveBeenCalledTimes(1);
    const arg = scrollBy.mock.calls[0][0] as ScrollToOptions;
    expect(arg.behavior).toBe("smooth");
    expect(arg.left).toBeGreaterThanOrEqual(280);
  });

  it("scrolls instantly under reduced motion", () => {
    mockReducedMotion(true);
    const list = setup();
    fireEvent.scroll(list);
    fireEvent.click(button("Next"));
    expect((scrollBy.mock.calls[0][0] as ScrollToOptions).behavior).toBe(
      "auto",
    );
  });

  it("keeps focus on the arrow after reaching the end", () => {
    const list = setup();
    fireEvent.scroll(list);
    const next = button("Next");
    next.focus();
    list.scrollLeft = 600;
    fireEvent.scroll(list);
    expect(off("Next")).toBe(true);
    expect(next.disabled).toBe(false);
    expect(document.activeElement).toBe(next);
    // a click on the exhausted arrow does nothing
    scrollBy.mockClear();
    fireEvent.click(next);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("makes a track without focusable items a labelled, focusable region", () => {
    const list = setup();
    const region = screen.getByRole("region", {
      name: "Catalog, scrollable list",
    });
    expect(region).toBe(list);
    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("leaves a track with links as a plain scroller (focusable items inside)", () => {
    renderWithIntl(
      <Carousel label="Promo">
        <button type="button">One</button>
        <button type="button">Two</button>
      </Carousel>,
    );
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("exposes the label as a named group", () => {
    setup();
    expect(screen.getByRole("group", { name: "Catalog" })).toBeTruthy();
  });
});
