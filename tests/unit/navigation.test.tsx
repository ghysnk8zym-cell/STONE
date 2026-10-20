// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextIntlClientProvider } from "next-intl";
import { type ComponentProps, type ReactElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/buttons/Button";
import { IconButton } from "@/components/buttons/IconButton";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { NavPill } from "@/components/navigation/NavPill";
import { LanguageSwitch } from "@/components/navigation/LanguageSwitch";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { ShellTabBar } from "@/components/navigation/ShellTabBar";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { INERT } from "@/components/navigation/nav-items";
import { TabBar } from "@/components/navigation/TabBar";
import {
  AccountContext,
  type AccountContextValue,
} from "@/features/account/account-context";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

// The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
// without the .js extension), so Link, usePathname and useRouter are mocked.
// KNOWN DEBT: the locale prefix of hrefs ("/en/catalog") and the real locale switch (cookie,
// redirect) are not covered here. They will be covered by the Playwright styleguide / locale
// e2e (Tasks 9 and Phase 3).
const { replace, pathname } = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: { current: "/catalog" },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  usePathname: () => pathname.current,
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockClear();
  pathname.current = "/catalog";
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
      expect(link.parentElement?.className).toContain("max-w-16");
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

  it("gives ancestor links a 44 px hit area without changing the 20 px row", () => {
    // Class-level check only: jsdom has no layout. The real geometry (hit area >= 44 px at 390,
    // row height unchanged, no overlap when the trail wraps) is covered by Playwright in Task 9.
    renderWithIntl(<Breadcrumb items={items} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    for (const link of within(nav).getAllByRole("link")) {
      // 20 px text + 12 px above + 12 px below, drawn by a pseudo-element so the focus ring
      // (outline on the link itself) still hugs the text
      expect(link.className).toContain("relative");
      expect(link.className).toContain("before:absolute");
      expect(link.className).toContain("before:-inset-y-3");
      expect(link.className).not.toMatch(/(^|\s)py-/);
    }
    // 20 px rows + 24 px row gap = 44 px pitch, so wrapped rows' hit areas do not overlap
    expect(nav.querySelector("ol")?.className).toContain("gap-y-6");
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

describe("TabBar page offset", () => {
  it("exposes the space the fixed bar covers as a pb-tabbar utility (phones only)", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );
    // bar 68 + bottom offset max(16, safe area) + 16 breathing room = 100 px
    expect(css).toMatch(
      /@utility pb-tabbar\s*\{\s*padding-bottom:\s*calc\(68px \+ max\(16px, env\(safe-area-inset-bottom\)\) \+ 16px\);/,
    );
    renderWithIntl(<TabBar current="home" />);
    expect(screen.getByRole("navigation").className).toContain(
      "bottom-[max(16px,env(safe-area-inset-bottom))]",
    );
  });

  it("keeps the footer's own 24 px bottom padding above the tab bar space (Figma 370 px footer + 100 px band)", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );
    expect(css.replace(/\s+/g, " ")).toContain(
      "@utility pb-footer-tabbar { padding-bottom: calc( 24px + 68px + max(16px, env(safe-area-inset-bottom)) + 16px ); }",
    );
    const footer = readFileSync(
      join(process.cwd(), "src", "components", "navigation", "SiteFooter.tsx"),
      "utf8",
    );
    expect(footer).toContain("max-md:pb-footer-tabbar");
    expect(footer).not.toContain("max-md:pb-tabbar");
  });
});

describe("inert navigation (Phase 3)", () => {
  function expectInert(element: HTMLElement | null, label: string) {
    expect(element, label).toBeTruthy();
    expect(element?.hasAttribute("href"), label).toBe(false);
    expect(element?.getAttribute("aria-disabled"), label).toBe("true");
    // inert keeps the default Figma look: no 45 % dim and no hover / pressed classes
    const classes = element?.className ?? "";
    expect(classes, label).not.toMatch(/opacity-45/);
    expect(classes, label).not.toMatch(/hov:|press:/);
    expect(element?.hasAttribute("tabindex"), label).toBe(false);
  }

  it("Button, IconButton and NavPill inert render the default look, not the Disabled state", () => {
    const { container } = renderWithIntl(
      <>
        <Button href="/projects" inert iconRight="arrow">
          Projects
        </Button>
        <Button inert iconRight="arrow">
          Soon
        </Button>
        <IconButton icon="user" label="Account" href="/account" inert />
        <NavPill href="/cart" inert>
          Cart
        </NavPill>
      </>,
    );
    const items = [
      ...container.querySelectorAll<HTMLElement>("[role=link], [role=button]"),
    ];
    expect(items).toHaveLength(4);
    expect(container.querySelector("button, a")).toBeNull();
    for (const item of items) expectInert(item, item.textContent ?? "icon");
  });

  it("INERT is empty: the Cart page exists since the test shop", () => {
    expect([...INERT.tabBar]).toEqual([]);
    expect([...INERT.nav]).toEqual([]);
  });

  it("TabBar renders every tab as a link with the shipped INERT list", () => {
    renderWithIntl(<TabBar current="home" inert={INERT.tabBar} />);
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    // live tabs stay real links: favourites and the account tab are live since Phase 4a
    for (const [name, href] of [
      ["Home", "/"],
      ["Catalog", "/catalog"],
      ["Favorites", "/account/favorites"],
      ["Sign in", "/account"],
    ] as const) {
      expect(
        within(nav).getByRole("link", { name }).getAttribute("href"),
        name,
      ).toBe(href);
    }
    expect(
      within(nav).getByRole("link", { name: "Cart" }).getAttribute("href"),
    ).toBe("/cart");
    expect(nav.querySelectorAll("a[href]")).toHaveLength(5);
  });

  it("SiteHeader renders the Cart pill as a live link; the account button is a live link", () => {
    renderWithIntl(<SiteHeader inert={INERT.nav} />);
    const banner = screen.getByRole("banner");
    const nav = within(banner).getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Cart" }).getAttribute("href"),
    ).toBe("/cart");
    expect(
      within(nav)
        .getByRole("link", { name: "Create Your Stone" })
        .getAttribute("href"),
    ).toBe("/create-your-stone");
    expect(
      within(nav).getByRole("link", { name: "Account" }).getAttribute("href"),
    ).toBe("/account");
    // the logo and the language switch stay active
    expect(
      within(banner)
        .getByRole("link", { name: "STONE — home" })
        .hasAttribute("href"),
    ).toBe(true);
    expect(
      (
        within(banner).getByRole("button", {
          name: /^RU \/ EN/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("MobileMenu receives the same inert list through the header", () => {
    renderWithIntl(<SiteHeader inert={INERT.nav} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    const nav = within(dialog).getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Cart" }).getAttribute("href"),
    ).toBe("/cart");
    expect(
      within(nav)
        .getByRole("link", { name: "Create Your Stone" })
        .getAttribute("href"),
    ).toBe("/create-your-stone");
    // the account entry is a live link
    expect(
      within(nav).getByRole("link", { name: "Account" }).getAttribute("href"),
    ).toBe("/account");
    expect(nav.querySelectorAll("a[href]")).toHaveLength(3);
    expect(
      within(dialog).getByRole("button", { name: /^RU \/ EN/ }),
    ).toBeTruthy();
  });
});

describe("session-aware account entries (Phase 4a)", () => {
  function withAccount(
    status: AccountContextValue["status"],
    ui: ReactElement,
  ) {
    const value: AccountContextValue = {
      status,
      name: status === "signed-in" ? "Alex" : null,
      isFavorite: () => false,
      toggleFavorite: () => {},
      setFavorite: () => {},
    };
    return renderWithIntl(
      <AccountContext.Provider value={value}>{ui}</AccountContext.Provider>,
    );
  }

  it.each([
    ["guest", "/sign-in"],
    ["signed-in", "/account"],
    ["loading", "/account"],
  ] as const)("%s: the header account button points at %s", (status, href) => {
    withAccount(status, <SiteHeader inert={INERT.nav} />);
    const banner = screen.getByRole("banner");
    expect(
      within(banner)
        .getByRole("link", { name: "Account" })
        .getAttribute("href"),
    ).toBe(href);
  });

  it.each([
    ["guest", "/sign-in"],
    ["signed-in", "/account"],
  ] as const)(
    "%s: the mobile menu account entry points at %s",
    (status, href) => {
      withAccount(status, <SiteHeader inert={INERT.nav} />);
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const nav = within(screen.getByRole("dialog")).getByRole("navigation", {
        name: "Main",
      });
      expect(
        within(nav).getByRole("link", { name: "Account" }).getAttribute("href"),
      ).toBe(href);
    },
  );

  it("the tab bar shows Sign in for a Guest and Account once signed in", () => {
    pathname.current = "/";
    const guest = withAccount("guest", <ShellTabBar />);
    let nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(
      within(nav).getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/sign-in");
    guest.unmount();

    withAccount("signed-in", <ShellTabBar />);
    nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(nav).queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(
      within(nav).getByRole("link", { name: "Account" }).getAttribute("href"),
    ).toBe("/account");
  });

  it("the Russian tab reads Вход for a Guest and Кабинет once signed in", () => {
    const value = (
      status: AccountContextValue["status"],
    ): AccountContextValue => ({
      status,
      name: null,
      isFavorite: () => false,
      toggleFavorite: () => {},
      setFavorite: () => {},
    });
    const guest = renderWithIntl(
      <AccountContext.Provider value={value("guest")}>
        <ShellTabBar />
      </AccountContext.Provider>,
      "ru",
    );
    expect(screen.getByRole("link", { name: "Вход" })).toBeTruthy();
    guest.unmount();
    renderWithIntl(
      <AccountContext.Provider value={value("signed-in")}>
        <ShellTabBar />
      </AccountContext.Provider>,
      "ru",
    );
    expect(screen.getByRole("link", { name: "Кабинет" })).toBeTruthy();
  });
});

describe("ShellTabBar", () => {
  function current() {
    return screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent);
  }

  it.each([
    ["/", ["Home"]],
    ["/catalog", ["Catalog"]],
    ["/catalog/black-marble", ["Catalog"]],
    ["/catalog/black-marble/", ["Catalog"]],
    ["/catalogue", []],
    ["/catalog/", ["Catalog"]],
    ["/account", ["Sign in"]],
    ["/account/orders", ["Sign in"]],
    ["/account/profile", ["Sign in"]],
    ["/account/favorites", ["Favorites"]],
    ["/accounts", []],
    ["/something-else", []],
  ] as const)("maps %s to the current tab", (path, expected) => {
    pathname.current = path;
    renderWithIntl(<ShellTabBar />);
    expect(current()).toEqual(expected);
  });

  it("keeps no tab inert: Cart is a live link", () => {
    renderWithIntl(<ShellTabBar />);
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(nav.querySelectorAll("a[href]")).toHaveLength(5);
    expect(nav.querySelectorAll("[aria-disabled=true]")).toHaveLength(0);
  });
});
