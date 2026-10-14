// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { type ComponentProps, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageSwitch } from "@/components/navigation/LanguageSwitch";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { SiteHeader } from "@/components/navigation/SiteHeader";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

// The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
// without the .js extension), so Link, usePathname and useRouter are mocked.
// KNOWN DEBT: the locale prefix of hrefs ("/en/catalog") and the real locale switch (cookie,
// redirect) are not covered here. They will be covered by the Playwright styleguide / locale
// e2e (Tasks 9 and Phase 3).
const replace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  usePathname: () => "/catalog",
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockClear();
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("SiteHeader", () => {
  it("header shows Create Your Stone, Cart and account on desktop markup", () => {
    renderWithIntl(<SiteHeader />);
    const banner = screen.getByRole("banner");
    const nav = within(banner).getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Create Your Stone" }),
    ).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Cart" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Account" })).toBeTruthy();
    expect(
      within(banner).getByRole("link", { name: "STONE — home" }),
    ).toBeTruthy();
    expect(
      within(banner).getByRole("button", { name: /^RU \/ EN/ }),
    ).toBeTruthy();
    // the mobile menu trigger is in the same DOM (hidden from 1280 px by CSS)
    expect(
      within(banner).getByRole("button", { name: "Open menu" }),
    ).toBeTruthy();
  });

  it("header copy follows the locale", () => {
    renderWithIntl(<SiteHeader />, "ru");
    expect(
      screen.getByRole("link", { name: "Создать свой камень" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Корзина" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Личный кабинет" })).toBeTruthy();
  });

  it("current item has aria-current", () => {
    const { rerender } = renderWithIntl(<SiteHeader current="cart" />);
    expect(
      screen.getByRole("link", { name: "Cart" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Create Your Stone" })
        .hasAttribute("aria-current"),
    ).toBe(false);
    expect(
      screen
        .getByRole("link", { name: "Account" })
        .hasAttribute("aria-current"),
    ).toBe(false);

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <SiteHeader current="account" />
      </NextIntlClientProvider>,
    );
    expect(
      screen
        .getByRole("link", { name: "Account" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Cart" }).hasAttribute("aria-current"),
    ).toBe(false);
  });

  it("menu button opens the mobile menu and exposes its state", () => {
    renderWithIntl(<SiteHeader current="create" />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(dialog)
        .getByRole("link", { name: "Create Your Stone" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("LanguageSwitch", () => {
  it("shows RU / EN with a name that contains the visible text", () => {
    renderWithIntl(<LanguageSwitch />, "ru");
    const button = screen.getByRole("button", { name: /^RU \/ EN/ });
    expect(button.textContent).toBe("RU/EN");
    expect(button.getAttribute("aria-label")).toBe(
      "RU / EN — переключить язык на английский",
    );
  });

  it("LanguageSwitch keeps path and query", () => {
    window.history.replaceState({}, "", "/ru/catalog?sort=az");
    renderWithIntl(<LanguageSwitch />, "ru");
    fireEvent.click(screen.getByRole("button", { name: /^RU \/ EN/ }));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      { pathname: "/catalog", query: { sort: "az" } },
      { locale: "en" },
    );
  });

  it("switches from en to ru and keeps repeated query keys", () => {
    window.history.replaceState({}, "", "/en/catalog?type=a&type=b&sort=az");
    renderWithIntl(<LanguageSwitch />, "en");
    fireEvent.click(screen.getByRole("button", { name: /^RU \/ EN/ }));
    expect(replace).toHaveBeenCalledWith(
      { pathname: "/catalog", query: { type: ["a", "b"], sort: "az" } },
      { locale: "ru" },
    );
  });

  it("sends no query when the URL has none", () => {
    window.history.replaceState({}, "", "/ru/catalog");
    renderWithIntl(<LanguageSwitch />, "ru");
    fireEvent.click(screen.getByRole("button", { name: /^RU \/ EN/ }));
    expect(replace).toHaveBeenCalledWith(
      { pathname: "/catalog" },
      { locale: "en" },
    );
  });
});

function MenuHarness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <main>
        <button type="button">Behind the menu</button>
      </main>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <MobileMenu
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      />
    </>
  );
}

function openMenu() {
  const trigger = screen.getByRole("button", { name: "Open" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

describe("MobileMenu", () => {
  it("renders nothing while closed", () => {
    renderWithIntl(<MenuHarness />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a labelled modal dialog with the nav entries and the language switch", () => {
    renderWithIntl(<MenuHarness />);
    openMenu();
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const nav = within(dialog).getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Create Your Stone" }),
    ).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Cart" })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Account" })).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: /^RU \/ EN/ }),
    ).toBeTruthy();
    expect(
      within(dialog).getByRole("button", { name: "Close menu" }),
    ).toBeTruthy();
  });

  it("moves focus into the dialog and makes the rest of the page inert", () => {
    renderWithIntl(<MenuHarness />);
    openMenu();
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    const main = document.querySelector("main") as HTMLElement;
    expect(main.closest("[inert]")).toBeTruthy();
    expect(dialog.closest("[inert]")).toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("MobileMenu closes on Escape and returns focus", () => {
    const onClose = vi.fn();
    renderWithIntl(<MenuHarness onClose={onClose} />);
    const trigger = openMenu();
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    // the page is reachable again
    const main = document.querySelector("main") as HTMLElement;
    expect(main.closest("[inert]")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes with the Close button and returns focus", () => {
    renderWithIntl(<MenuHarness />);
    const trigger = openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when a link is chosen", () => {
    renderWithIntl(<MenuHarness />);
    openMenu();
    const cart = screen.getByRole("link", { name: "Cart" });
    cart.addEventListener("click", (event) => event.preventDefault()); // jsdom cannot navigate
    fireEvent.click(cart);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("traps Tab and Shift+Tab inside the dialog", () => {
    renderWithIntl(<MenuHarness />);
    openMenu();
    const dialog = screen.getByRole("dialog");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>("a[href], button"),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(tab);
    });
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      document.dispatchEvent(shiftTab);
    });
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("works in Russian", () => {
    render(
      <NextIntlClientProvider locale="ru" messages={ru}>
        <MenuHarness />
      </NextIntlClientProvider>,
    );
    openMenu();
    const dialog = screen.getByRole("dialog", { name: "Меню" });
    expect(
      within(dialog).getByRole("button", { name: "Закрыть меню" }),
    ).toBeTruthy();
  });
});
