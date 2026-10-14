// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Calculator } from "@/app/[locale]/(site)/catalog/[slug]/Calculator";
import { Gallery } from "@/app/[locale]/(site)/catalog/[slug]/Gallery";
import { SpecRows } from "@/app/[locale]/(site)/catalog/[slug]/SpecRows";

import { renderWithIntl } from "./render";

vi.mock("next/image", async () => {
  const { default: manifest } =
    await import("../../assets/figma-manifest.json");
  const keys = new Set(manifest.images.map((image) => image.file));
  return {
    default: ({
      src,
      alt,
      sizes,
      className,
    }: ComponentProps<"img"> & {
      src: string;
      fill?: boolean;
      preload?: boolean;
    }) => {
      if (!keys.has(src)) throw new Error(`Image not in manifest: ${src}`);
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/${src}-390.webp`}
          alt={alt}
          sizes={sizes}
          className={className}
        />
      );
    },
  };
});

afterEach(cleanup);

const text = (el: HTMLElement) => (el.textContent ?? "").replace(/\s+/g, " ");

describe("Calculator", () => {
  it("shows $528.00 for black marble default", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    const result = screen.getByTestId("calculator-result");
    expect(text(result)).toContain("Surface area2.00 m²");
    expect(text(result)).toContain("+0.20 m²");
    expect(text(result)).toContain("2.20 m²");
    expect(text(result)).toContain("$240.00 / m²");
    expect(text(result)).toContain("$528.00");
    expect(screen.getByText("Illustrative estimate")).toBeTruthy();
    expect(screen.getByLabelText(/Surface area \(m²\)/)).toHaveProperty(
      "value",
      "2.00",
    );
  });

  it("the result block is a polite live region and inputs are decimal", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    expect(
      screen.getByTestId("calculator-result").getAttribute("aria-live"),
    ).toBe("polite");
    expect(
      screen.getByLabelText(/Surface area \(m²\)/).getAttribute("inputmode"),
    ).toBe("decimal");
  });

  it("switching to wall keeps the result for 2 × 1", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    fireEvent.click(screen.getByRole("button", { name: "Wall dimensions" }));
    expect(screen.getByLabelText("Length (m)")).toHaveProperty("value", "2.00");
    expect(screen.getByLabelText("Height (m)")).toHaveProperty("value", "1.00");
    expect(screen.queryByLabelText(/Surface area \(m²\)/)).toBeNull();
    expect(text(screen.getByTestId("calculator-result"))).toContain("$528.00");
  });

  it("the mode switch is a group of two aria-pressed buttons", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    const group = screen.getByRole("group", { name: "Calculation mode" });
    const [area, wall] = within(group).getAllByRole("button");
    expect(area.getAttribute("aria-pressed")).toBe("true");
    expect(wall.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(wall);
    expect(area.getAttribute("aria-pressed")).toBe("false");
    expect(wall.getAttribute("aria-pressed")).toBe("true");
  });

  it("wall mode computes length × height", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    fireEvent.click(screen.getByRole("button", { name: "Wall dimensions" }));
    fireEvent.change(screen.getByLabelText("Length (m)"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Height (m)"), {
      target: { value: "2,5" },
    });
    const result = text(screen.getByTestId("calculator-result"));
    expect(result).toContain("10.00 m²");
    expect(result).toContain("+1.00 m²");
    expect(result).toContain("$2,640.00");
  });

  it("types 2,5 in ru and shows 660,00 $", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />, "ru");
    fireEvent.change(screen.getByLabelText(/Площадь поверхности/), {
      target: { value: "2,5" },
    });
    const result = text(screen.getByTestId("calculator-result")).replace(
      / | /g,
      " ",
    );
    expect(result).toContain("660,00 $");
    expect(result).toContain("2,50 м²");
  });

  it("clearing the area shows an error and a dash", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    const field = screen.getByLabelText(/Surface area \(m²\)/);
    fireEvent.change(field, { target: { value: "" } });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe(
      "Enter a number, e.g. 2.5",
    );
    const result = text(screen.getByTestId("calculator-result"));
    expect(result).not.toContain("$528.00");
    expect(screen.getByTestId("calculator-total").textContent).toBe("—");
  });

  it("an out-of-range value names the limits", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    fireEvent.change(screen.getByLabelText(/Surface area \(m²\)/), {
      target: { value: "20000" },
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "Enter a value from 0.01 to 10,000",
    );
    expect(screen.getByTestId("calculator-total").textContent).toBe("—");
  });

  it("flags only the offending wall field", () => {
    renderWithIntl(<Calculator unitCents={24000} isPlaceholder />);
    fireEvent.click(screen.getByRole("button", { name: "Wall dimensions" }));
    fireEvent.change(screen.getByLabelText("Height (m)"), {
      target: { value: "abc" },
    });
    expect(
      screen.getByLabelText("Height (m)").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      screen.getByLabelText("Length (m)").getAttribute("aria-invalid"),
    ).toBeNull();
  });
});

describe("Gallery", () => {
  const base = {
    image: "images/catalog/black-marble",
    alt: "Black Marble",
    fit: "contain" as const,
    aspect: [1536, 1024] as [number, number],
    crop: { left: -105.88, size: 294.12 },
    label: "Product images",
  };
  const views = [
    { id: "full" as const, label: "Show the full image" },
    { id: "detail" as const, label: "Show a close-up" },
  ];

  it("thumbnail click changes the main image", () => {
    const { container } = renderWithIntl(<Gallery {...base} views={views} />);
    const main = container.querySelector("[data-gallery-main]")!;
    expect(main.getAttribute("data-view")).toBe("full");
    const [full, detail] = screen.getAllByRole("button");
    expect(full.getAttribute("aria-pressed")).toBe("true");
    expect(detail.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(detail);
    expect(main.getAttribute("data-view")).toBe("detail");
    expect(detail.getAttribute("aria-pressed")).toBe("true");
    expect(full.getAttribute("aria-pressed")).toBe("false");
  });

  it("hides the thumbnails when there is one view", () => {
    renderWithIntl(<Gallery {...base} views={[views[0]]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("img", { name: "Black Marble" })).toBeTruthy();
  });
});

describe("SpecRows", () => {
  it("renders label and value pairs as a description list", () => {
    const { container } = renderWithIntl(
      <SpecRows
        rows={[
          { label: "Material", value: "Marble" },
          { label: "Format", value: "600×300×20 mm" },
        ]}
      />,
    );
    expect(container.querySelectorAll("dt")).toHaveLength(2);
    expect(container.querySelector("dd")?.textContent).toBe("Marble");
  });
});
