// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { Icon, type IconName } from "@/components/icons/Icon";

import { renderWithIntl } from "./render";

const names: IconName[] = [
  "search",
  "menu",
  "close",
  "arrow",
  "bag",
  "chevron",
  "check",
  "dismiss",
  "back",
  "heart",
  "home",
  "grid",
  "user",
];

describe("Icon", () => {
  afterEach(cleanup);

  it("is aria-hidden and uses the icon mask", () => {
    const { container } = renderWithIntl(<Icon name="menu" />);
    const icon = container.firstElementChild as HTMLElement;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("style")).toContain("/icons/menu.svg");
    expect(icon.getAttribute("style")).toContain("currentcolor");
  });

  it("sizes the box from the size prop and defaults to 24", () => {
    const first = renderWithIntl(<Icon name="check" />);
    const byDefault = first.container.firstElementChild as HTMLElement;
    expect(byDefault.style.width).toBe("24px");
    expect(byDefault.style.height).toBe("24px");
    const second = renderWithIntl(<Icon name="check" size={12} />);
    const small = second.container.firstElementChild as HTMLElement;
    expect(small.style.width).toBe("12px");
    expect(small.style.height).toBe("12px");
  });

  it("merges className", () => {
    const { container } = renderWithIntl(
      <Icon name="heart" className="text-red" />,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "text-red",
    );
  });

  it.each(names)("public/icons/%s.svg exists", (name) => {
    expect(
      existsSync(join(process.cwd(), "public", "icons", `${name}.svg`)),
    ).toBe(true);
  });
});
