// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CarouselArrow } from "@/components/buttons/CarouselArrow";
import { IconButton } from "@/components/buttons/IconButton";
import { SocialButton } from "@/components/buttons/SocialButton";

import { renderWithIntl } from "./render";

// The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
// without the .js extension), so Link is mocked as a plain anchor.
// KNOWN DEBT: the locale prefix of hrefs ("/en/catalog") is not covered here. It will be
// covered by the Playwright styleguide e2e (Task 9).
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));

afterEach(cleanup);

describe("IconButton", () => {
  it("IconButton exposes its label as accessible name", () => {
    renderWithIntl(<IconButton icon="menu" label="Open menu" />);
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveProperty("type", "button");
  });

  it("IconButton without label is a type error", () => {
    // @ts-expect-error `label` is required: an icon-only control needs an accessible name
    renderWithIntl(<IconButton icon="menu" />);
    expect(true).toBe(true);
  });

  it("pressed sets aria-pressed", () => {
    const { rerender } = renderWithIntl(
      <IconButton icon="heart" label="Save" tone="light" pressed />,
    );
    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("aria-pressed"),
    ).toBe("true");
    rerender(<IconButton icon="heart" label="Save" tone="light" />);
    expect(
      screen.getByRole("button", { name: "Save" }).hasAttribute("aria-pressed"),
    ).toBe(false);
  });

  it("calls onClick, but not when disabled", () => {
    const onClick = vi.fn();
    const { rerender } = renderWithIntl(
      <IconButton icon="close" label="Close" onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <IconButton icon="close" label="Close" onClick={onClick} disabled />,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders an anchor with the given href and the label as name", () => {
    renderWithIntl(<IconButton icon="back" label="Back" href="/catalog" />);
    const link = screen.getByRole("link", { name: "Back" });
    expect(link.getAttribute("href")).toBe("/catalog");
  });

  it("disabled link renders no anchor and no href, so it cannot navigate", () => {
    const { container } = renderWithIntl(
      <IconButton icon="back" label="Back" href="/catalog" disabled />,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[href]")).toBeNull();
    const link = screen.getByRole("link", { name: "Back" });
    expect(link.tagName).toBe("SPAN");
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });

  it("reflects a frozen state in data-state", () => {
    renderWithIntl(<IconButton icon="user" label="Account" state="hover" />);
    expect(
      screen
        .getByRole("button", { name: "Account" })
        .getAttribute("data-state"),
    ).toBe("hover");
  });
});

describe("CarouselArrow", () => {
  it("CarouselArrow uses localized labels", () => {
    const { unmount } = renderWithIntl(
      <>
        <CarouselArrow direction="prev" />
        <CarouselArrow direction="next" />
      </>,
      "en",
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    unmount();

    renderWithIntl(
      <>
        <CarouselArrow direction="prev" />
        <CarouselArrow direction="next" />
      </>,
      "ru",
    );
    expect(screen.getByRole("button", { name: "Назад" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Вперёд" })).toBeTruthy();
  });

  it("calls onClick, but not when disabled", () => {
    const onClick = vi.fn();
    const { unmount } = renderWithIntl(
      <CarouselArrow direction="next" onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    // rerender() would drop the intl provider, so mount a fresh tree.
    unmount();
    renderWithIntl(
      <CarouselArrow direction="next" onClick={onClick} disabled />,
    );
    const button = screen.getByRole("button", { name: "Next" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("SocialButton", () => {
  it("SocialButton is a link with its label", () => {
    renderWithIntl(<SocialButton label="TG" href="https://t.me/stone" />);
    const link = screen.getByRole("link", { name: "Telegram" });
    expect(link.getAttribute("href")).toBe("https://t.me/stone");
    expect(link.textContent).toBe("TG");
  });

  it("names every network in full, in both locales", () => {
    const names = {
      en: ["Telegram", "VKontakte", "Instagram", "WhatsApp"],
      ru: ["Telegram", "ВКонтакте", "Instagram", "WhatsApp"],
    } as const;
    for (const locale of ["en", "ru"] as const) {
      const { unmount } = renderWithIntl(
        <>
          <SocialButton label="TG" href="/a" />
          <SocialButton label="VK" href="/b" />
          <SocialButton label="IG" href="/c" />
          <SocialButton label="WA" href="/d" />
        </>,
        locale,
      );
      for (const name of names[locale]) {
        expect(screen.getByRole("link", { name })).toBeTruthy();
      }
      unmount();
    }
  });

  it("disabled renders no anchor and no href", () => {
    const { container } = renderWithIntl(
      <SocialButton label="VK" href="https://vk.com/stone" disabled />,
    );
    expect(container.querySelector("[href]")).toBeNull();
    const link = screen.getByRole("link", { name: "VKontakte" });
    expect(link.tagName).toBe("SPAN");
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });
});
