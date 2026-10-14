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

import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { LanguageSwitch } from "@/components/navigation/LanguageSwitch";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { TabBar } from "@/components/navigation/TabBar";

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

const TAB_HREFS = {
  Home: "/",
  Catalog: "/catalog",
  Favorites: "/account/favorites",
  Cart: "/cart",
  "Sign in": "/account",
} as const;

describe("TabBar", () => {
  it("TabBar renders 5 localized links", () => {
    renderWithIntl(<TabBar current="home" />);
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Home",
      "Catalog",
      "Favorites",
      "Cart",
      "Sign in",
    ]);
    for (const [name, href] of Object.entries(TAB_HREFS)) {
      // the accessible name is exactly the visible label (WCAG 2.5.3); icons are decorative
      expect(within(nav).getByRole("link", { name }).getAttribute("href")).toBe(
        href,
      );
    }
    expect(within(nav).getAllByRole("listitem")).toHaveLength(5);
  });

  it("renders the Figma labels in Russian", () => {
    renderWithIntl(<TabBar current="home" />, "ru");
    const nav = screen.getByRole("navigation", {
      name: "Мобильная навигация",
    });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Главная", "Каталог", "Избранное", "Корзина", "Вход"]);
  });

  it("marks only the current tab with aria-current", () => {
    const { rerender } = renderWithIntl(<TabBar current="favorites" />);
    expect(
      screen
        .getByRole("link", { name: "Favorites" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("aria-current")),
    ).toHaveLength(1);

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <TabBar />
      </NextIntlClientProvider>,
    );
    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("aria-current")),
    ).toHaveLength(0);
  });

  it("keeps its landmark name distinct from the main navigation", () => {
    renderWithIntl(
      <>
        <SiteHeader />
        <TabBar current="cart" />
      </>,
    );
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("navigation")).toHaveLength(2);
  });

  it("is hidden from 768 px by CSS and keeps the Figma 64x52 touch area", () => {
    renderWithIntl(<TabBar current="home" />);
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("md:hidden");
    for (const link of within(nav).getAllByRole("link")) {
      expect(link.className).toContain("h-[52px]");
      expect(link.className).toContain("w-16");
    }
  });
});

describe("Breadcrumb", () => {
  const items = [
    { label: "Catalog", href: "/catalog" },
    { label: "Marble", href: "/catalog?type=marble" },
    { label: "Black Marble" },
  ];

  it("is a labelled navigation with an ordered list", () => {
    renderWithIntl(<Breadcrumb items={items} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("Breadcrumb marks last item current", () => {
    renderWithIntl(<Breadcrumb items={items} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Catalog",
      "Marble",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/catalog",
      "/catalog?type=marble",
    ]);
    const current = within(nav).getByText("Black Marble");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.closest("a")).toBeNull();
    for (const link of links) {
      expect(link.hasAttribute("aria-current")).toBe(false);
    }
  });

  it("never links the last item, even when it has an href", () => {
    renderWithIntl(
      <Breadcrumb
        items={[
          { label: "Catalog", href: "/catalog" },
          { label: "Black Marble", href: "/catalog/black-marble" },
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("Black Marble").getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("renders a middle item without href as plain text", () => {
    renderWithIntl(
      <Breadcrumb
        items={[
          { label: "Catalog", href: "/catalog" },
          { label: "Marble" },
          { label: "Black Marble" },
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("Marble").closest("a")).toBeNull();
  });

  it("hides the separators from assistive technology", () => {
    renderWithIntl(<Breadcrumb items={items} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const separators = Array.from(nav.querySelectorAll('[aria-hidden="true"]'));
    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator.textContent).toBe("/");
    }
  });

  it("works with a single item and in Russian", () => {
    renderWithIntl(<Breadcrumb items={[{ label: "Каталог" }]} />, "ru");
    const nav = screen.getByRole("navigation", { name: "Хлебные крошки" });
    expect(within(nav).queryAllByRole("link")).toHaveLength(0);
    expect(within(nav).getByText("Каталог").getAttribute("aria-current")).toBe(
      "page",
    );
    expect(nav.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });
});

describe("SiteFooter", () => {
  const links = {
    information: "/information",
    about: "/about",
    reviews: "/reviews",
  };
  const social = {
    TG: "https://t.example/stone",
    VK: "https://vk.example/stone",
    IG: "https://ig.example/stone",
    WA: "https://wa.example/stone",
  };

  it("is the contentinfo landmark with a labelled link list", () => {
    renderWithIntl(<SiteFooter links={links} />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.tagName).toBe("FOOTER");
    const nav = within(footer).getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Information", "/information"],
      ["About us", "/about"],
      ["Reviews", "/reviews"],
    ]);
  });

  it("shows the wordmark, copyright and privacy link", () => {
    renderWithIntl(<SiteFooter privacyHref="/privacy" />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("STONE")).toBeTruthy();
    expect(
      within(footer).getByText("© 2026 STONE. All rights reserved."),
    ).toBeTruthy();
    expect(
      within(footer)
        .getByRole("link", { name: "Privacy policy" })
        .getAttribute("href"),
    ).toBe("/privacy");
  });

  it("lists the four social links under Follow us", () => {
    renderWithIntl(<SiteFooter social={social} />);
    const group = screen.getByRole("list", { name: "Follow us" });
    const links = within(group).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "TG, Telegram",
      "VK, VKontakte",
      "IG, Instagram",
      "WA, WhatsApp",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      social.TG,
      social.VK,
      social.IG,
      social.WA,
    ]);
    expect(links.every((link) => !link.hasAttribute("aria-disabled"))).toBe(
      true,
    );
  });

  it("renders destinations that were not supplied as disabled, never as dead links", () => {
    renderWithIntl(<SiteFooter links={{ about: "/about" }} />);
    const footer = screen.getByRole("contentinfo");
    // supplied: a real link
    expect(
      within(footer)
        .getByRole("link", { name: "About us" })
        .getAttribute("href"),
    ).toBe("/about");
    // missing: inert, announced as disabled, no href
    for (const name of ["Information", "Reviews", "Privacy policy"]) {
      const inert = within(footer).getByText(name).closest("[role=link]");
      expect(inert?.getAttribute("aria-disabled"), name).toBe("true");
      expect(inert?.hasAttribute("href"), name).toBe(false);
    }
    for (const label of ["TG", "VK", "IG", "WA"]) {
      const inert = within(footer).getByText(label);
      expect(inert.getAttribute("aria-disabled"), label).toBe("true");
      expect(inert.hasAttribute("href"), label).toBe(false);
    }
  });

  it("serves the desktop and the mobile layout from one DOM", () => {
    renderWithIntl(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toContain("lg:");
    expect(within(footer).getAllByText("STONE")).toHaveLength(1);
  });

  it("has distinct landmark names next to the header and the tab bar", () => {
    renderWithIntl(
      <>
        <SiteHeader />
        <SiteFooter />
        <TabBar current="home" />
      </>,
    );
    const names = screen
      .getAllByRole("navigation")
      .map((nav) => nav.getAttribute("aria-label"));
    expect(names).toEqual(["Main", "Footer", "Mobile navigation"]);
  });

  it("is localized", () => {
    renderWithIntl(<SiteFooter links={links} />, "ru");
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("navigation", { name: "Нижняя навигация" }),
    ).toBeTruthy();
    expect(within(footer).getByRole("link", { name: "О нас" })).toBeTruthy();
    expect(
      within(footer).getByText("© 2026 STONE. Все права защищены."),
    ).toBeTruthy();
    expect(
      within(footer).getByRole("list", { name: "Мы в соцсетях" }),
    ).toBeTruthy();
  });
});
