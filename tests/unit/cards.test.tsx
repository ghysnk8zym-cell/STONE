// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/cards/ProductCard";
import { ShowcaseCard } from "@/components/cards/ShowcaseCard";

import { renderWithIntl } from "./render";

// The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
// without the .js extension), so Link is mocked as a plain anchor.
// KNOWN DEBT: the locale prefix of hrefs ("/en/catalog/black-marble") is not covered here. It will
// be covered by the Playwright styleguide e2e (Task 9).
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));

// next/image reads images.loader from next.config, which Vitest does not load. The stand-in renders a
// plain <img> and, like the spec requires, rejects any `src` that is not a manifest key.
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
    }: ComponentProps<"img"> & { src: string; fill?: boolean }) => {
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

const usd = (amount: number, isPlaceholder = false) => ({
  amount,
  currency: "USD" as const,
  isPlaceholder,
});

const IMAGE = { src: "images/catalog/black-marble", alt: "Black Marble slab" };

function productCard(props: Partial<ComponentProps<typeof ProductCard>> = {}) {
  return (
    <ProductCard
      href="/catalog/black-marble"
      name="Black Marble"
      meta="Marble · 600×300×20 mm"
      image={IMAGE}
      price={usd(240)}
      {...props}
    />
  );
}

describe("ProductCard", () => {
  it("ProductCard links to the product", () => {
    renderWithIntl(productCard());
    const link = screen.getByRole("link", { name: "Black Marble" });
    expect(link.getAttribute("href")).toBe("/catalog/black-marble");
    // One link per card: the whole card is its hit area, and the heart is not nested in it.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    const heart = screen.getByRole("button");
    expect(link.contains(heart)).toBe(false);
    expect(heart.closest("a")).toBeNull();
  });

  it("the link overlay covers the whole card and the heart stays above it", () => {
    renderWithIntl(productCard());
    const link = screen.getByRole("link", { name: "Black Marble" });
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
    const heartLayer = screen.getByRole("button").parentElement as HTMLElement;
    expect(heartLayer.className).toContain("z-10");
  });

  it("ProductCard formats USD per m² for ru and en", () => {
    const en = renderWithIntl(productCard(), "en");
    expect(screen.getByText("$240.00 / m²")).toBeTruthy();
    en.unmount();

    renderWithIntl(productCard(), "ru");
    // ru groups the currency sign after the number with a no-break space.
    const text = screen.getByText(/^240,00\s\$ \/ м²$/);
    expect(text).toBeTruthy();
  });

  it("ProductCard shows old price and discount badge", () => {
    renderWithIntl(
      productCard({ price: usd(75), oldPrice: usd(88), discountPercent: 15 }),
    );
    // Real minus sign (U+2212), as drawn in Figma.
    expect(screen.getByText("−15%")).toBeTruthy();
    const old = screen.getByText("$88.00 / m²");
    expect(old.tagName).toBe("S");
    // The strike-through alone does not tell a screen reader what the figure is.
    expect(screen.getByText("Previous price").className).toContain("sr-only");
    expect(screen.getByText("$75.00 / m²")).toBeTruthy();
  });

  it("without a discount there is no badge and no old price", () => {
    const { container } = renderWithIntl(productCard());
    expect(screen.queryByText(/%/)).toBeNull();
    expect(container.querySelector("s")).toBeNull();
  });

  it("ProductCard without image renders placeholder", () => {
    const { container } = renderWithIntl(productCard({ image: undefined }));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Image coming soon")).toBeTruthy();
  });

  it("ProductCard with image renders it with the given alt and sizes", () => {
    const { container } = renderWithIntl(productCard());
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe("Black Marble slab");
    expect(img.getAttribute("sizes")).toContain("276px");
    expect(screen.queryByText("Image coming soon")).toBeNull();
  });

  it("imageFit contain keeps the whole slab in frame", () => {
    const { container } = renderWithIntl(productCard({ imageFit: "contain" }));
    expect(container.querySelector("img")?.className).toContain(
      "object-contain",
    );
  });

  it("favorite toggle has its own accessible name and aria-pressed", () => {
    const onToggle = vi.fn();
    const { unmount } = renderWithIntl(
      productCard({ favorite: true, onFavoriteToggle: onToggle }),
    );
    const heart = screen.getByRole("button", {
      name: "Save Black Marble to favorites",
    });
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(heart);
    expect(onToggle).toHaveBeenCalledTimes(1);

    unmount();

    renderWithIntl(
      productCard({ favorite: false, onFavoriteToggle: onToggle }),
    );
    expect(
      screen
        .getByRole("button", { name: "Save Black Marble to favorites" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("favorite label is localized", () => {
    renderWithIntl(productCard(), "ru");
    expect(
      screen.getByRole("button", {
        name: "Сохранить «Black Marble» в избранное",
      }),
    ).toBeTruthy();
  });

  it("a placeholder price carries a visually hidden illustrative note", () => {
    const { unmount } = renderWithIntl(
      productCard({ price: usd(240, true) }),
      "en",
    );
    expect(screen.getByText("Illustrative price").className).toContain(
      "sr-only",
    );
    unmount();

    renderWithIntl(productCard({ price: usd(240, true) }), "ru");
    expect(screen.getByText("Ориентировочная цена")).toBeTruthy();
  });

  it("a real price has no illustrative note", () => {
    renderWithIntl(productCard());
    expect(screen.queryByText("Illustrative price")).toBeNull();
  });

  it("reflects a frozen state in data-state", () => {
    const { container } = renderWithIntl(productCard({ state: "hover" }));
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe(
      "hover",
    );
  });
});

const SHOWCASE_IMAGE = { src: "images/showcase/work", alt: "Kitchen" };

describe("ShowcaseCard", () => {
  it("ShowcaseCard work type has no price", () => {
    const { container } = renderWithIntl(
      <ShowcaseCard
        type="work"
        layout="desktop"
        href="/projects/kitchen"
        title="Marble kitchen countertop"
        subtitle="Precise pattern matching"
        image={SHOWCASE_IMAGE}
      />,
    );
    expect(screen.queryByText(/\/ m²/)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(container.querySelector("s")).toBeNull();
    const link = screen.getByRole("link", {
      name: "Marble kitchen countertop",
    });
    expect(link.getAttribute("href")).toBe("/projects/kitchen");
    expect(screen.getByText("Precise pattern matching")).toBeTruthy();
  });

  it("a work card without href is not a link and keeps its title", () => {
    renderWithIntl(
      <ShowcaseCard
        type="work"
        layout="responsive"
        title="Bathroom cladding"
        subtitle="Full-height slabs"
        image={{
          ...SHOWCASE_IMAGE,
          crop: {
            className: "left-[-37%] top-[-200%] h-[333%] w-[174%]",
            width: 562,
            height: 941,
          },
        }}
      />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "Bathroom cladding" }),
    ).toBeTruthy();
    expect(screen.getByRole("img").className).toContain("top-[-200%]");
  });

  it("phone cards carry an inert heart only when favoriteLabel is given", () => {
    const { rerender } = renderWithIntl(
      <ShowcaseCard
        type="product"
        layout="responsive"
        href="/catalog/black-marble"
        title="Black Marble"
        subtitle="Marble"
        image={IMAGE}
        favoriteLabel="Save Black Marble to favorites"
      />,
    );
    const heart = screen.getByRole("button", {
      name: "Save Black Marble to favorites",
    });
    expect(heart.getAttribute("aria-disabled")).toBe("true");
    expect(heart.className).not.toMatch(/opacity-45/);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    rerender(
      <ShowcaseCard
        type="product"
        layout="responsive"
        href="/catalog/black-marble"
        title="Black Marble"
        subtitle="Marble"
        image={IMAGE}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("responsive layout carries mobile classes with md: desktop overrides", () => {
    const { container } = renderWithIntl(
      <ShowcaseCard
        type="product"
        layout="responsive"
        href="/catalog/black-marble"
        title="Black Marble"
        subtitle="Marble"
        image={IMAGE}
      />,
    );
    const html = container.innerHTML;
    expect(html).toContain("h-[140px]");
    expect(html).toContain("md:h-[220px]");
  });

  it("promo type shows price, old price and the discount badge", () => {
    renderWithIntl(
      <ShowcaseCard
        type="promo"
        layout="mobile"
        href="/catalog/taupe-rock"
        title="Taupe Rock"
        subtitle="Sandstone · 600×300×20 mm"
        image={{ src: "images/catalog/taupe-rock", alt: "Taupe Rock" }}
        price={usd(32)}
        oldPrice={usd(40)}
        discountPercent={20}
      />,
    );
    expect(screen.getByText("$32.00 / m²")).toBeTruthy();
    expect(screen.getByText("$40.00 / m²").tagName).toBe("S");
    expect(screen.getByText("−20%")).toBeTruthy();
  });

  it("product type shows name and meta only", () => {
    renderWithIntl(
      <ShowcaseCard
        type="product"
        layout="desktop"
        href="/catalog/black-marble"
        title="Black Marble"
        subtitle="Marble"
        image={IMAGE}
        imageFit="contain"
      />,
    );
    expect(screen.getByText("Marble")).toBeTruthy();
    expect(screen.queryByText(/\/ m²/)).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("the link is named by the title, not by the whole card text", () => {
    renderWithIntl(
      <ShowcaseCard
        type="promo"
        layout="desktop"
        href="/catalog/taupe-rock"
        title="Taupe Rock"
        subtitle="Sandstone"
        image={{ src: "images/catalog/taupe-rock", alt: "Taupe Rock" }}
        price={usd(32)}
        oldPrice={usd(40)}
        discountPercent={20}
      />,
    );
    expect(screen.getByRole("link", { name: "Taupe Rock" })).toBeTruthy();
  });

  it("price placeholder note is rendered for an illustrative price", () => {
    const { container } = renderWithIntl(
      <ShowcaseCard
        type="promo"
        layout="desktop"
        href="/catalog/taupe-rock"
        title="Taupe Rock"
        subtitle="Sandstone"
        image={{ src: "images/catalog/taupe-rock", alt: "Taupe Rock" }}
        price={usd(240, true)}
      />,
    );
    const article = container.querySelector("article") as HTMLElement;
    expect(within(article).getByText("Illustrative price")).toBeTruthy();
  });

  it("every layout and type renders with a manifest image", () => {
    for (const layout of ["desktop", "mobile"] as const) {
      const { container, unmount } = renderWithIntl(
        <>
          <ShowcaseCard
            type="product"
            layout={layout}
            href="/a"
            title="A"
            subtitle="a"
            image={IMAGE}
          />
          <ShowcaseCard
            type="work"
            layout={layout}
            href="/b"
            title="B"
            subtitle="b"
            image={SHOWCASE_IMAGE}
          />
        </>,
      );
      expect(container.querySelectorAll("img")).toHaveLength(2);
      unmount();
    }
  });

  it("reflects a frozen state in data-state", () => {
    const { container } = renderWithIntl(
      <ShowcaseCard
        type="work"
        layout="mobile"
        href="/b"
        title="B"
        subtitle="b"
        image={SHOWCASE_IMAGE}
        state="focus"
      />,
    );
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe(
      "focus",
    );
  });
});
