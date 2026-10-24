import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { IconButton } from "@/components/buttons/IconButton";
import { ProductCard, type Price } from "@/components/cards/ProductCard";
import type { Locale } from "@/i18n/routing";
import { productName } from "@/lib/product-copy";
import { sortByLabel } from "@/lib/sort-by-label";
import {
  COLOR_GROUPS,
  discountPercent,
  getCatalog,
  parseCatalogQuery,
  SORTS,
  type CatalogQuery,
  type Localizer,
  type Product,
} from "@/server/catalog";

import { PAGE_SURFACE_ATTR, PAGE_SURFACE_CATALOG } from "../page-surface";
import { CatalogFilters, type FilterField } from "./CatalogFilters";
import { CustomOrderBanner } from "./CustomOrderBanner";
import { EmptyState } from "./EmptyState";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "meta.catalog",
  });
  return { title: t("title"), description: t("description") };
}

/** Money is cents in the data and dollars at the component boundary. */
function price(cents: number): Price {
  return { amount: cents / 100, currency: "USD", isPlaceholder: true };
}

/** Locale-free catalog path for a query (the Link adds the locale). */
function catalogPath(query: CatalogQuery, drop: (keyof CatalogQuery)[] = []) {
  const params = new URLSearchParams();
  const { sort, ...rest } = query;
  for (const [key, value] of Object.entries(rest)) {
    if (drop.includes(key as keyof CatalogQuery) || value === undefined) {
      continue;
    }
    params.set(key, value === true ? "1" : String(value));
  }
  if (sort !== "name-asc" && !drop.includes("sort")) params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

/*
 * Catalog (Figma 1440 922:25494, 1024 922:25741, 768 922:25976, 390 922:26324). Page surface
 * stone/catalog-page; Main padding 80 / 40 / 32 / 16 sides and 48 / 40 / 32 / 24 top, 96 / 80 / 72 / 56
 * bottom; Back row 46 + 16; Container max 1286 with gap 28; grid 4 / 3 / 2 / 2 columns, gap 32 x 24
 * (16 x 12 on phones), cards top-aligned (their heights differ with the old-price line).
 * The filter state is the URL: see CatalogFilters.
 */
export default async function CatalogPage({
  params,
  searchParams,
}: PageProps<"/[locale]/catalog">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const query = parseCatalogQuery(await searchParams);

  const t = await getTranslations("pages.catalog");
  const c = await getTranslations("catalog");

  // product slugs and materials are data, so the keys are checked by the seed/message parity test
  type CatalogKey = Parameters<typeof c>[0];
  // Messages are the fallback for the name (the database repository prefers the stored translation of
  // `locale` for search and sorting); a product that is only in the database falls back to its slug.
  const name = (slug: string) =>
    c.has(`products.${slug}.name` as CatalogKey)
      ? c(`products.${slug}.name` as CatalogKey)
      : slug;
  const material = (m: Product["material"]) => c(`material.${m}` as CatalogKey);
  const localizer: Localizer = {
    name,
    material,
    locale,
    preferStoredNames: true,
  };

  const catalog = await getCatalog();
  const [products, total, facets] = await Promise.all([
    catalog.list(query, localizer),
    catalog.total(),
    catalog.facets(),
  ]);

  const fields: FilterField[] = [
    {
      name: "material",
      label: t("filters.material"),
      value: query.material ?? "",
      options: [
        { value: "", label: t("filters.allMaterials") },
        // facets come sorted by enum key; the visible list is alphabetical in the current locale
        ...sortByLabel(
          facets.materials.map((m) => ({ value: m, label: material(m) })),
          locale,
        ),
      ],
    },
    {
      name: "color",
      label: t("filters.color"),
      value: query.color ?? "",
      options: [
        { value: "", label: t("filters.allColors") },
        ...COLOR_GROUPS.filter((g) => facets.colors.includes(g)).map((g) => ({
          value: g,
          label: c(`colorGroup.${g}` as CatalogKey),
        })),
      ],
    },
    {
      name: "finish",
      label: t("filters.finish"),
      value: query.finish ?? "",
      options: [
        { value: "", label: t("filters.allFinishes") },
        ...facets.finishes.map((f) => ({
          value: f,
          label: c(`finish.${f}` as CatalogKey),
        })),
      ],
    },
    {
      name: "sort",
      label: t("filters.sort"),
      value: query.sort,
      options: SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) })),
    },
  ];

  const emptyActions: { label: string; href: string }[] = [];
  if (query.color) {
    emptyActions.push({
      label: t("empty.clearColor"),
      href: catalogPath(query, ["color"]),
    });
  }
  if (query.material) {
    emptyActions.push({
      label: t("empty.clearMaterial"),
      href: catalogPath(query, ["material"]),
    });
  }
  emptyActions.push({ label: t("empty.reset"), href: "/catalog" });

  return (
    <div
      {...{ [PAGE_SURFACE_ATTR]: PAGE_SURFACE_CATALOG }}
      className="bg-stone-catalog-page flex-1 px-4 pt-6 pb-14 md:px-8 md:pt-8 md:pb-[72px] lg:px-10 lg:pt-10 lg:pb-20 min-[90rem]:px-20 min-[90rem]:pt-12 min-[90rem]:pb-24"
    >
      <div className="mx-auto flex w-full max-w-(--layout-content-width) flex-col">
        <div className="pb-4">
          <IconButton icon="back" tone="ink" href="/" label={t("back")} />
        </div>
        <div className="flex flex-col gap-7">
          <CatalogFilters
            title={
              <h1 className="type-catalog-page-title text-ink [font-family:var(--font-display)] text-[44px] leading-[52px] md:text-[56px] md:leading-[64px] min-[90rem]:text-[72px] min-[90rem]:leading-[80px]">
                {t("title")}
              </h1>
            }
            results={
              <div className="type-catalog-meta text-stone-catalog-secondary flex flex-col">
                <p aria-live="polite" aria-atomic="true">
                  {t("showing", { shown: products.length, total })}
                </p>
                <p>{t("placeholderPrices")}</p>
              </div>
            }
            fields={fields}
            q={query.q ?? ""}
            sale={query.sale === true}
            searchLabel={t("searchLabel")}
            searchPlaceholder={t("searchPlaceholder")}
            applyLabel={t("applyFilters")}
          />

          {products.length === 0 ? (
            <EmptyState
              title={t("empty.title")}
              body={t("empty.body")}
              actions={emptyActions}
            />
          ) : (
            <ul className="grid list-none grid-cols-2 items-start gap-x-3 gap-y-4 p-0 md:gap-x-6 md:gap-y-8 lg:grid-cols-3 min-[90rem]:grid-cols-4">
              {products.map((p) => (
                <li key={p.slug} className="min-w-0">
                  <ProductCard
                    href={`/catalog/${p.slug}`}
                    name={productName(p, locale, c)}
                    meta={c("meta" as CatalogKey, {
                      material: material(p.material),
                      w: p.formatMm[0],
                      h: p.formatMm[1],
                      d: p.formatMm[2],
                    })}
                    image={{ src: p.image, alt: "" }}
                    imageFit={p.imageFit}
                    price={price(p.priceCents)}
                    oldPrice={
                      p.oldPriceCents === undefined
                        ? undefined
                        : price(p.oldPriceCents)
                    }
                    discountPercent={discountPercent(p)}
                    favoriteSlug={p.slug}
                  />
                </li>
              ))}
            </ul>
          )}

          <CustomOrderBanner />
        </div>
      </div>
    </div>
  );
}
