import { useTranslations } from "next-intl";

import type { InteractionState } from "@/components/buttons/Button";
import { type Price, ProductCard } from "@/components/cards/ProductCard";
import { ShowcaseCard } from "@/components/cards/ShowcaseCard";

import { Example, Group, Section } from "../parts";

/* The calculator's USD 240/m² placeholder (Phase 2 rule: labelled as illustrative). */
const PRICE: Price = { amount: 240, currency: "USD", isPlaceholder: true };
const OLD_PRICE: Price = { amount: 300, currency: "USD", isPlaceholder: true };
const DISCOUNT = 20;

/* Figma card widths: catalog grid 302 (1440) / 173 (390); Home v2 showcase 353; mobile carousel 148 / 240 / 280. */
const PRODUCT_WIDTH = "w-[173px] md:w-[302px]";
const SHOWCASE_WIDTH = {
  desktop: "w-[353px] max-w-full",
  mobile: {
    product: "w-[148px]",
    promo: "w-[240px]",
    work: "w-[280px]",
  },
} as const;

type CardState = Extract<InteractionState, "hover" | "focus" | "pressed">;

/** Catalog ProductCard with the black marble photo, in a frozen state. */
function Product({ state }: { state?: CardState }) {
  const d = useTranslations("styleguide.demo.blackMarble");
  return (
    <div className={PRODUCT_WIDTH}>
      <ProductCard
        href="/"
        name={d("name")}
        meta={d("meta")}
        image={{ src: "images/catalog/black-marble", alt: d("alt") }}
        imageFit="contain"
        price={PRICE}
        state={state}
      />
    </div>
  );
}

/** ShowcaseCard of one type and layout; promo carries the price row and the discount badge. */
function Showcase({
  type,
  layout,
  state,
}: {
  type: "product" | "promo" | "work";
  layout: "desktop" | "mobile";
  state?: CardState;
}) {
  const stone = useTranslations("styleguide.demo");
  const width =
    layout === "desktop" ? SHOWCASE_WIDTH.desktop : SHOWCASE_WIDTH.mobile[type];

  if (type === "work") {
    return (
      <ShowcaseCard
        type="work"
        layout={layout}
        href="/"
        title={stone("work.title")}
        subtitle={stone("work.description")}
        image={{ src: "images/showcase/work", alt: stone("work.alt") }}
        state={state}
        className={width}
      />
    );
  }
  if (type === "promo") {
    return (
      <ShowcaseCard
        type="promo"
        layout={layout}
        href="/"
        title={stone("goldenRock.name")}
        subtitle={stone("goldenRock.meta")}
        image={{
          src: "images/catalog/golden-rock",
          alt: stone("goldenRock.alt"),
        }}
        price={PRICE}
        oldPrice={OLD_PRICE}
        discountPercent={DISCOUNT}
        state={state}
        className={width}
      />
    );
  }
  return (
    <ShowcaseCard
      type="product"
      layout={layout}
      href="/"
      title={stone("graphiteStack.name")}
      subtitle={stone("graphiteStack.meta")}
      image={{
        src: "images/catalog/graphite-stack",
        alt: stone("graphiteStack.alt"),
      }}
      state={state}
      className={width}
    />
  );
}

export function Cards() {
  const t = useTranslations("styleguide");
  const c = useTranslations("styleguide.cards");
  const stone = useTranslations("styleguide.demo");
  const states = {
    default: t("states.default"),
    hover: t("states.hover"),
    focus: t("states.focus"),
    pressed: t("states.pressed"),
  };

  return (
    <Section id="cards" title={t("sections.cards")} intro={t("statesNote")}>
      <div className="flex flex-col gap-12">
        <Group title={c("product")} note={c("placeholderNote")}>
          <Example
            data-qa="product-card-default"
            caption={states.default}
            tone="light"
          >
            <Product />
          </Example>
          <Example
            data-qa="product-card-hover"
            caption={states.hover}
            tone="light"
          >
            <Product state="hover" />
          </Example>
          <Example
            data-qa="product-card-focus"
            caption={states.focus}
            tone="light"
          >
            <Product state="focus" />
          </Example>
          <Example
            data-qa="product-card-pressed"
            caption={states.pressed}
            tone="light"
          >
            <Product state="pressed" />
          </Example>
          <Example
            data-qa="product-card-discount"
            caption={c("discount")}
            tone="light"
          >
            <div className={PRODUCT_WIDTH}>
              <ProductCard
                href="/"
                name={stone("concretePaver.name")}
                meta={stone("concretePaver.meta")}
                image={{
                  src: "images/catalog/concrete-paver",
                  alt: stone("concretePaver.alt"),
                }}
                price={PRICE}
                oldPrice={OLD_PRICE}
                discountPercent={DISCOUNT}
              />
            </div>
          </Example>
          <Example
            data-qa="product-card-favorite"
            caption={c("favorite")}
            tone="light"
          >
            <div className={PRODUCT_WIDTH}>
              <ProductCard
                href="/"
                name={stone("graphiteStack.name")}
                meta={stone("graphiteStack.meta")}
                image={{
                  src: "images/catalog/graphite-stack",
                  alt: stone("graphiteStack.alt"),
                }}
                price={PRICE}
                favorite
              />
            </div>
          </Example>
          <Example
            data-qa="product-card-no-image"
            caption={c("noImage")}
            tone="light"
          >
            <div className={PRODUCT_WIDTH}>
              <ProductCard
                href="/"
                name={stone("goldenRock.name")}
                meta={stone("goldenRock.meta")}
                price={PRICE}
              />
            </div>
          </Example>
          <Example
            data-qa="product-card-long-name"
            caption={c("longName")}
            tone="light"
          >
            <div className={PRODUCT_WIDTH}>
              <ProductCard
                href="/"
                name={stone("longName.name")}
                meta={stone("longName.meta")}
                image={{
                  src: "images/catalog/black-marble",
                  alt: stone("blackMarble.alt"),
                }}
                imageFit="contain"
                price={PRICE}
                oldPrice={OLD_PRICE}
                discountPercent={DISCOUNT}
              />
            </div>
          </Example>
        </Group>

        <Group title={c("showcase")}>
          <Example
            data-qa="showcase-card-product-desktop"
            caption={`${c("types.product")} · ${c("layouts.desktop")}`}
            tone="light"
          >
            <Showcase type="product" layout="desktop" />
          </Example>
          <Example
            data-qa="showcase-card-product-mobile"
            caption={`${c("types.product")} · ${c("layouts.mobile")}`}
            tone="light"
          >
            <Showcase type="product" layout="mobile" />
          </Example>
          <Example
            data-qa="showcase-card-promo-desktop"
            caption={`${c("types.promo")} · ${c("layouts.desktop")}`}
            tone="light"
          >
            <Showcase type="promo" layout="desktop" />
          </Example>
          <Example
            data-qa="showcase-card-promo-mobile"
            caption={`${c("types.promo")} · ${c("layouts.mobile")}`}
            tone="light"
          >
            <Showcase type="promo" layout="mobile" />
          </Example>
          <Example
            data-qa="showcase-card-work-desktop"
            caption={`${c("types.work")} · ${c("layouts.desktop")}`}
          >
            <Showcase type="work" layout="desktop" />
          </Example>
          <Example
            data-qa="showcase-card-work-mobile"
            caption={`${c("types.work")} · ${c("layouts.mobile")}`}
          >
            <Showcase type="work" layout="mobile" />
          </Example>
          <Example
            data-qa="showcase-card-promo-desktop-hover"
            caption={`${c("types.promo")} · ${states.hover}`}
            tone="light"
          >
            <Showcase type="promo" layout="desktop" state="hover" />
          </Example>
          <Example
            data-qa="showcase-card-promo-desktop-focus"
            caption={`${c("types.promo")} · ${states.focus}`}
            tone="light"
          >
            <Showcase type="promo" layout="desktop" state="focus" />
          </Example>
          <Example
            data-qa="showcase-card-promo-desktop-pressed"
            caption={`${c("types.promo")} · ${states.pressed}`}
            tone="light"
          >
            <Showcase type="promo" layout="desktop" state="pressed" />
          </Example>
          <Example
            data-qa="showcase-card-work-desktop-hover"
            caption={`${c("types.work")} · ${states.hover}`}
          >
            <Showcase type="work" layout="desktop" state="hover" />
          </Example>
          <Example
            data-qa="showcase-card-work-desktop-focus"
            caption={`${c("types.work")} · ${states.focus}`}
          >
            <Showcase type="work" layout="desktop" state="focus" />
          </Example>
          <Example
            data-qa="showcase-card-work-desktop-pressed"
            caption={`${c("types.work")} · ${states.pressed}`}
          >
            <Showcase type="work" layout="desktop" state="pressed" />
          </Example>
        </Group>
      </div>
    </Section>
  );
}
