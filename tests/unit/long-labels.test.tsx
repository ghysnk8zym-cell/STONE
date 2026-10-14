// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/buttons/Button";
import { NavPill } from "@/components/navigation/NavPill";

import { renderWithIntl } from "./render";

// The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
// without the .js extension), so Link is mocked as a plain anchor.
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));

afterEach(cleanup);

/*
 * Long labels (Russian copy runs longer than English) must not overflow a narrow column: the pill
 * stays single-line, its label truncates with an ellipsis, the icons keep their size. jsdom has no
 * layout, so this is a class-level check; real geometry (scrollWidth <= clientWidth, no page
 * overflow at 390) is asserted by the Playwright styleguide spec (Task 9 part B).
 */
const LONG =
  "Заказать бесплатный образец натурального камня для вашего проекта";

function expectTruncating(root: HTMLElement) {
  expect(root.className).toContain("max-w-full");
  expect(root.className).toContain("min-w-0");
  const label = screen.getByText(LONG);
  expect(label.parentElement).toBe(root);
  expect(label.className).toContain("truncate");
  expect(label.className).toContain("min-w-0");
}

describe("long labels", () => {
  it("Button (every variant, with an icon) truncates its label inside a max-w-full root", () => {
    for (const variant of [
      "pill",
      "primary",
      "light",
      "outline",
      "graphite",
      "save",
    ] as const) {
      const { unmount } = renderWithIntl(
        <Button variant={variant} iconRight="arrow">
          {LONG}
        </Button>,
      );
      // The accessible name is still the whole label.
      expectTruncating(screen.getByRole("button", { name: LONG }));
      unmount();
    }
  });

  it("Button as a link and as a disabled link truncates too", () => {
    const { unmount } = renderWithIntl(<Button href="/x">{LONG}</Button>);
    expectTruncating(screen.getByRole("link", { name: LONG }));
    unmount();
    renderWithIntl(
      <Button href="/x" disabled>
        {LONG}
      </Button>,
    );
    expectTruncating(screen.getByRole("link", { name: LONG }));
  });

  it("a loading Button keeps the spinner outside the truncating label", () => {
    renderWithIntl(
      <Button type="submit" loading>
        {LONG}
      </Button>,
    );
    const root = screen.getByRole("button");
    expectTruncating(root);
    const spinner = root.querySelector("span[aria-hidden='true']");
    expect(spinner?.className).toContain("shrink-0");
  });

  it("NavPill (link, button, disabled, current) truncates its label", () => {
    const cases = [
      <NavPill key="a" href="/x">
        {LONG}
      </NavPill>,
      <NavPill key="b" onClick={() => {}}>
        {LONG}
      </NavPill>,
      <NavPill key="c" href="/x" disabled>
        {LONG}
      </NavPill>,
      <NavPill key="d" href="/x" current>
        {LONG}
      </NavPill>,
    ];
    for (const ui of cases) {
      const { container, unmount } = renderWithIntl(ui);
      expectTruncating(container.firstElementChild as HTMLElement);
      unmount();
    }
  });
});
