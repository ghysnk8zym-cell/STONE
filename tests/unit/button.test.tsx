// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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

  it("renders a link (the locale-aware Link) when href is given", () => {
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

  it("disabled link is aria-disabled and not focusable", () => {
    renderWithIntl(
      <Button href="/catalog" disabled>
        Open catalog
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open catalog" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
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
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(0);
    const status = screen.getByText("Loading");
    expect(status.className).toContain("sr-only");
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
    const icon = container.querySelector("button span[aria-hidden='true']");
    expect(icon).not.toBeNull();
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
