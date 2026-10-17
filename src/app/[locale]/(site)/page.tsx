import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ShowcaseCard } from "@/components/cards/ShowcaseCard";
import type { Price } from "@/components/cards/Price";
import type { Locale } from "@/i18n/routing";
import { discountPercent, getCatalog, type Product } from "@/server/catalog";

import { Backdrop } from "./_home/Backdrop";
import { Hero } from "./_home/Hero";
import { ShowcaseSection } from "./_home/ShowcaseSection";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "meta.home",
  });
  return { title: t("title"), description: t("description") };
}

/*
 * Card widths in the carousels (Figma): phones 148 (catalog) / 240 (promo) / 280 (works); 222 at 768,
 * 297 at 1024 and 356 from 1440. The cards themselves fill their list item.
 */
const FROM_TABLET = "md:w-[222px] lg:w-[297px] min-[90rem]:w-[356px]";
const CATALOG_ITEM = `w-[148px] ${FROM_TABLET}`;
const PROMO_ITEM = `w-[240px] ${FROM_TABLET}`;
const WORK_ITEM = `w-[280px] ${FROM_TABLET}`;

/*
 * The three work photos are crops of two source images (Figma Media of Card/Showcase Work, values from
 * Home v2 at 390 / 1440): the marble kitchen and the bathroom are two windows into the same tall shot.
 */
const WORKS = [
  {
    key: "marble-kitchen-countertop",
    src: "images/showcase/work",
    width: 562,
    height: 941,
    crop: "h-[333.33%] w-[174.24%] left-[-37.12%] top-[-66.67%] md:w-[171.72%] md:left-[-35.86%]",
  },
  {
    key: "natural-stone-fireplace-portal",
    src: "images/works/natural-stone-fireplace-portal",
    width: 736,
    height: 977,
    crop: "h-[238.1%] w-[156.82%] left-[-28.41%] top-[-123.81%] md:w-[154.55%] md:left-[-27.27%]",
  },
  {
    key: "bathroom-cladding",
    src: "images/showcase/work",
    width: 562,
    height: 941,
    crop: "h-[333.33%] w-[174.24%] left-[-37.12%] top-[-200%] md:w-[171.72%] md:left-[-35.86%]",
  },
] as const;

/** Money is cents in the data and dollars at the component boundary. */
function price(cents: number): Price {
  return { amount: cents / 100, currency: "USD", isPlaceholder: true };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("pages.home");
  const c = await getTranslations("catalog");
  const cc = await getTranslations("components");
  const catalog = await getCatalog();
  const [featured, promo] = await Promise.all([
    catalog.listFeatured(),
    catalog.listPromo(),
  ]);

  // product slugs and materials are data, so the key is checked at the seed/message parity test
  type CatalogKey = Parameters<typeof c>[0];
  const name = (p: Product) => c(`products.${p.slug}.name` as CatalogKey);
  const material = (p: Product) => c(`material.${p.material}` as CatalogKey);
  const favorite = (p: Product) =>
    cc("productCard.favorite", { name: name(p) });
  const format = (p: Product) =>
    c("meta" as CatalogKey, {
      material: material(p),
      w: p.formatMm[0],
      h: p.formatMm[1],
      d: p.formatMm[2],
    });

  return (
    <div className="relative isolate overflow-clip md:-mt-[72px]">
      <Backdrop />
      <Hero locale={locale as Locale} />
      <div className="relative z-10 flex flex-col items-center gap-(--layout-section-gap) px-(--layout-margin) pt-(--layout-main-top) pb-(--layout-section-gap) max-md:pt-0 max-md:pb-6">
        <ShowcaseSection
          id="home-catalog"
          label={t("sections.catalog")}
          action={{ label: t("actions.openCatalog"), href: "/catalog" }}
          carouselClassName={CATALOG_ITEM}
        >
          {featured.map((p) => (
            <ShowcaseCard
              key={p.slug}
              type="product"
              layout="responsive"
              href={`/catalog/${p.slug}`}
              title={name(p)}
              subtitle={material(p)}
              favoriteLabel={favorite(p)}
              image={{ src: p.image, alt: "" }}
              imageFit={p.imageFit}
              className="w-full"
            />
          ))}
        </ShowcaseSection>
        <ShowcaseSection
          id="home-promo"
          label={t("sections.promo")}
          note={t("placeholderPrices")}
          action={{ label: t("actions.offers"), href: "/catalog?sale=1" }}
          carouselClassName={PROMO_ITEM}
        >
          {promo.map((p) => (
            <ShowcaseCard
              key={p.slug}
              type="promo"
              layout="responsive"
              href={`/catalog/${p.slug}`}
              title={name(p)}
              subtitle={format(p)}
              favoriteLabel={favorite(p)}
              image={{ src: p.image, alt: "" }}
              imageFit={p.imageFit}
              price={price(p.priceCents)}
              oldPrice={
                p.oldPriceCents === undefined
                  ? undefined
                  : price(p.oldPriceCents)
              }
              discountPercent={discountPercent(p)}
              className="w-full"
            />
          ))}
        </ShowcaseSection>
        <ShowcaseSection
          id="home-works"
          label={t("sections.works")}
          action={{ label: t("actions.projects") }}
          carouselClassName={WORK_ITEM}
        >
          {WORKS.map((work) => (
            <ShowcaseCard
              key={work.key}
              type="work"
              layout="responsive"
              title={t(`works.${work.key}.title`)}
              subtitle={t(`works.${work.key}.subtitle`)}
              image={{
                src: work.src,
                alt: "",
                crop: {
                  className: work.crop,
                  width: work.width,
                  height: work.height,
                },
              }}
              className="w-full"
            />
          ))}
        </ShowcaseSection>
      </div>
    </div>
  );
}
