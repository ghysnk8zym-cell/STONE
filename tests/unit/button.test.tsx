// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ComponentProps, FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/buttons/Button";

import { renderWithIntl } from "./render";

// The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
// without the .js extension), so Link is mocked as a plain anchor.
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));

afterEach(cleanup);

describe("Button", () => {
  it("renders a button with type button by default", () => {
    renderWithIntl(<Button>Offers</Button>);
    const button = screen.getByRole("button", { name: "Offers" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveProperty("type", "button");
  });

  // KNOWN DEBT: the real next-intl Link cannot load under Vitest, so the locale prefix of the
  // href ("/en/catalog") is not covered here. It will be covered by the Playwright styleguide
  // e2e (Task 9).
  it("renders an anchor with the given href", () => {
    renderWithIntl(<Button href="/catalog">Open catalog</Button>, "en");
    const link = screen.getByRole("link", { name: "Open catalog" });
    expect(link.getAttribute("href")).toBe("/catalog");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("disabled button does not call onClick", () => {
    const onClick = vi.fn();
    renderWithIntl(
      <Button disabled onClick={onClick}>
        Offers
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Offers" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled link renders no anchor and no href, so it cannot navigate", () => {
    const { container } = renderWithIntl(
      <Button href="/catalog" disabled>
        Open catalog
      </Button>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[href]")).toBeNull();
    const link = screen.getByRole("link", { name: "Open catalog" });
    expect(link.tagName).toBe("SPAN");
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBeNull();
  });

  it("loading button ignores clicks and announces the busy state", () => {
    const onClick = vi.fn();
    renderWithIntl(
      <Button type="submit" loading onClick={onClick}>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Send/ });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(0);
    const status = screen.getByText("Loading");
    expect(status.className).toContain("sr-only");
  });

  it("loading button keeps keyboard focus (no native disabled)", () => {
    renderWithIntl(
      <Button type="submit" loading>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Send/ });
    expect(button).toHaveProperty("disabled", false);
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
  });

  it("clicking a loading submit button does not submit its form", () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    renderWithIntl(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Send
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clicking an idle submit button submits its form", () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    renderWithIntl(
      <form onSubmit={onSubmit}>
        <Button type="submit">Send</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("loading text follows the locale", () => {
    renderWithIntl(
      <Button type="submit" loading>
        Отправить
      </Button>,
      "ru",
    );
    expect(screen.getByText("Загрузка")).toBeTruthy();
  });

  it("an idle submit button is not busy and calls onClick", () => {
    const onClick = vi.fn();
    renderWithIntl(
      <Button type="submit" onClick={onClick}>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toHaveProperty("type", "submit");
    expect(button.getAttribute("aria-busy")).toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("state prop sets data-state", () => {
    renderWithIntl(<Button state="hover">Offers</Button>);
    expect(
      screen.getByRole("button", { name: "Offers" }).getAttribute("data-state"),
    ).toBe("hover");
  });

  it("iconRight renders an aria-hidden icon", () => {
    const { container } = renderWithIntl(
      <Button iconRight="arrow">Offers</Button>,
    );
    // Idle button: the only aria-hidden span is the Icon (the spinner exists only while loading).
    const icons = container.querySelectorAll("button span[aria-hidden='true']");
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute("style")).toContain("/icons/arrow.svg");
  });

  it("iconLeft renders an icon before the label", () => {
    const { container } = renderWithIntl(
      <Button variant="primary" iconLeft="search">
        Search
      </Button>,
    );
    const button = container.querySelector("button")!;
    const icon = button.firstElementChild!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("style")).toContain("/icons/search.svg");
  });

  it("save variant shows the heart icon by default", () => {
    const { container } = renderWithIntl(<Button variant="save">Save</Button>);
    const icon = container.querySelector("button span[aria-hidden='true']");
    expect(icon?.getAttribute("style")).toContain("/icons/heart.svg");
  });

  it("renders every variant", () => {
    for (const variant of [
      "pill",
      "primary",
      "light",
      "outline",
      "graphite",
      "save",
    ] as const) {
      const { unmount } = renderWithIntl(
        <Button variant={variant}>{variant}</Button>,
      );
      expect(screen.getByRole("button", { name: variant })).toBeTruthy();
      unmount();
    }
  });
});
