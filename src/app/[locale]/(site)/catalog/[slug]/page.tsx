import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/buttons/Button";
import { IconButton } from "@/components/buttons/IconButton";
import { FavoriteSaveButton } from "@/features/account/FavoriteControls";
import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import type { Locale } from "@/i18n/routing";
import { imageSize } from "@/lib/image-size";
import { NOT_FOUND_SEGMENT } from "@/lib/route-gate";
import { productDescription, productName } from "@/lib/product-copy";
import { getCatalog, type Product } from "@/server/catalog";

import { PAGE_SURFACE_ATTR, PAGE_SURFACE_CATALOG } from "../../page-surface";
import { Calculator } from "./Calculator";
import { Gallery, type GalleryCrop } from "./Gallery";
import { SpecRows } from "./SpecRows";

/*
 * Rendered per request, deliberately not SSG / ISR. The catalog lives in the database (Phase 4a) and the middleware
 * gate cannot know which slugs exist, so an unknown slug reaches this route. On an ISR route
 * Next writes that 404 to the route cache like any page (measured with `next start`: `x-nextjs-cache: HIT` and
 * `Cache-Control: s-maxage=31536000`), one entry per requested slug, and there is no per-slug way to opt out (a dynamic
 * API in the not-found branch makes the on-demand render a 500). Rendering per request keeps the answer to "found" or
 * "404, not cached", and an admin's edit, unpublish or new product is visible at once without depending on
 * revalidatePath (the Cloudflare build has no incremental cache and renders per request anyway).
 * An unknown or unpublished slug is redirected (307, no-store) to the gate's 404 page: notFound() thrown during render
 * makes Next 16.3.8 send an empty error shell. See docs/ARCHITECTURE.md, "Route gate and the localised 404".
 */
export const dynamic = "force-dynamic";

/** One lookup per request: the page and generateMetadata both need the product. */
const findProduct = cache(async (slug: string) =>
  (await getCatalog()).getBySlug(slug),
);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await findProduct(slug);
  if (!product) return {};
  const c = await getTranslations({
    locale: locale as Locale,
    namespace: "catalog",
  });
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "meta.product",
  });
  const values = {
    name: productName(product, locale, c),
    description: productDescription(product, locale, c),
  };
  return { title: t("title", values), description: t("description", values) };
}

/*
 * The Figma crop of the second thumbnail (Product 1440 Thumb 2 782:11536 and the other 11 screens)
 * depends on how the image is fitted: studio slabs (contain) are shown 294.12 % wide at left -105.88 %,
 * photographs (cover) 200 % wide at left -50 %. Verified on Black Marble, Grey Limestone, Grey Marble
 * (contain) and Charcoal Ledger, Concrete Paver (cover).
 */
const CROPS: Record<Product["imageFit"], GalleryCrop> = {
  contain: { left: -105.88, size: 294.12 },
  cover: { left: -50, size: 200 },
};

/*
 * Product (Figma 1440 782:11526, 1024 782:11577, 768 782:11639, 390 782:11727). Page surface
 * stone/catalog-page; Main padding 77 / 40 / 32 / 16 sides, top 32 / 32 / 24 / 20, bottom 80 / 80 / 80 / 40;
 * Back row 46 + 16; Product max 1286 with gap 24; Columns: 1440 gallery 726 + 40 + info 520, 1024 gallery 512
 * + 32 + info 400, 768 and 390 stacked (gap 24). Title 56/64, 44/52, 44/52, 28/36 (Lusitana).
 */
export default async function ProductPage({
  params,
}: PageProps<"/[locale]/catalog/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const product = await findProduct(slug);
  // notFound() here would send the empty error shell (no content without JavaScript, see the comment above), so an
  // unknown or unpublished product is sent to the gate's server-rendered 404 page: 307, no-store, then 404 + noindex.
  if (!product) redirect(`/${locale}/${NOT_FOUND_SEGMENT}`);

  const t = await getTranslations("pages.product");
  const c = await getTranslations("catalog");
  // product slugs and enum values are data: the keys are checked by the catalog messages test
  type CatalogKey = Parameters<typeof c>[0];
  const name = productName(product, locale, c);
  const material = c(`material.${product.material}` as CatalogKey);
  const [w, h, d] = product.formatMm;

  return (
    <div
      {...{ [PAGE_SURFACE_ATTR]: PAGE_SURFACE_CATALOG }}
      className="bg-stone-catalog-page flex-1 px-4 pt-5 pb-10 md:px-8 md:pt-6 md:pb-20 lg:px-10 lg:pt-8 min-[90rem]:px-[77px]"
    >
      <div className="mx-auto flex w-full max-w-[1286px] flex-col">
        <div className="pb-4">
          <IconButton
            icon="back"
            tone="ink"
            href="/catalog"
            label={t("back")}
          />
        </div>
        <div className="flex flex-col gap-6">
          <Breadcrumb
            items={[
              { label: t("breadcrumbCatalog"), href: "/catalog" },
              {
                label: material,
                href: `/catalog?material=${product.material}`,
              },
              { label: name },
            ]}
          />
          <div className="flex flex-col gap-6 md:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8 min-[90rem]:grid-cols-[minmax(0,1fr)_520px] min-[90rem]:gap-10">
            <Gallery
              image={product.image}
              alt={name}
              fit={product.imageFit}
              aspect={imageSize(product.image)}
              crop={CROPS[product.imageFit]}
              label={t("gallery.label")}
              views={[
                { id: "full", label: t("gallery.full") },
                { id: "detail", label: t("gallery.detail") },
              ]}
            />
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-ink min-w-0 flex-1 [font-family:var(--font-display)] text-[28px] leading-9 md:text-[44px] md:leading-[52px] min-[90rem]:text-[56px] min-[90rem]:leading-16">
                  {name}
                </h1>
                <FavoriteSaveButton slug={product.slug} label={t("save")} />
              </div>
              <p className="type-catalog-field-value text-ink-secondary">
                {productDescription(product, locale, c)}
              </p>
              <SpecRows
                rows={[
                  { label: t("specs.material"), value: material },
                  {
                    label: t("specs.color"),
                    value: c(`color.${product.color}` as CatalogKey),
                  },
                  {
                    label: t("specs.finish"),
                    value: c(`finish.${product.finish}` as CatalogKey),
                  },
                  {
                    label: t("specs.format"),
                    value: t("formatValue", { w, h, d }),
                  },
                ]}
              />
              <Calculator unitCents={product.priceCents} isPlaceholder />
              <div className="flex flex-col gap-4">
                <Button variant="graphite-solid" inert className="w-full">
                  {t("buyNow")}
                </Button>
                <Button variant="outline" inert className="w-full">
                  {t("addToCart")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
