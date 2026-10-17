import { useTranslations } from "next-intl";

import { ProductImage } from "../account/parts";
import { AdminSearch, AdminSelect } from "./fields";
import { FilterForm } from "./FilterForm";
import { useAdminMoney } from "./money";
import {
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
} from "./parts";
import { Link } from "@/i18n/navigation";
import type { AdminProduct, ProductStatusFilter } from "@/server/admin/queries";

/*
 * Admin Products (Figma 1440 1077:52506, 1024 1077:55616): the summary line, the toolbar (search and Status filter),
 * the "Published products" card with the Admin/Product card grid (1067:985: 210 px image on stone/catalog-photo,
 * 26/32 name, material, status, divider, price, Edit product) and the "Draft to finish" list. Figma also shows the
 * stock of each product; the data model has none yet, so the card shows the price only.
 */

function useMaterial() {
  const c = useTranslations("catalog");
  return (material: string) =>
    c.has(`material.${material}` as never)
      ? c(`material.${material}` as never)
      : material;
}

export function ProductsToolbar({
  q,
  status,
}: {
  q: string;
  status: ProductStatusFilter;
}) {
  const t = useTranslations("admin.products");
  return (
    <FilterForm className="max-md:flex-wrap">
      <AdminSearch
        label={t("searchLabel")}
        name="q"
        defaultValue={q}
        placeholder={t("searchPlaceholder")}
        className="min-w-0 flex-1"
      />
      <AdminSelect
        label={t("filterStatus")}
        name="status"
        value={status}
        hideLabel
        className="w-[240px]"
        options={[
          { value: "all", label: t("status.all") },
          { value: "published", label: t("status.published") },
          { value: "draft", label: t("status.draft") },
        ]}
      />
    </FilterForm>
  );
}

function ProductCard({ product }: { product: AdminProduct }) {
  const t = useTranslations("admin.products");
  const per = useTranslations("components.price")("perSquareMetre");
  const money = useAdminMoney();
  const material = useMaterial();
  return (
    <li className="border-stone-catalog-line bg-stone-catalog-card flex min-w-0 flex-col overflow-clip rounded-2xl border">
      <ProductImage
        image={product.image}
        fit={product.imageFit}
        className="h-[210px] w-full rounded-none"
        sizes="(min-width: 1440px) 420px, 320px"
      />
      <div className="flex flex-col gap-3.5 px-5 pt-[18px] pb-5">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="type-catalog-product-name-lg text-stone-catalog-ink wrap-anywhere">
              {product.name}
            </h3>
            <p className={ADMIN_MUTED}>{material(product.material)}</p>
          </div>
          <div className="flex items-center gap-2.5 pt-1.5">
            <span
              aria-hidden="true"
              className="bg-stone-catalog-line h-5 w-px"
            />
            <p className={ADMIN_MUTED}>
              {product.published ? t("status.published") : t("status.draft")}
            </p>
          </div>
        </div>
        <div className="bg-stone-catalog-line h-px w-full" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className={ADMIN_MUTED}>{t("price")}</p>
          <p className="type-catalog-product-name-lg text-stone-catalog-ink">
            {money(product.priceCents)} {per}
            {product.oldPriceCents !== null && (
              <span className="type-catalog-meta text-stone-catalog-secondary ml-2 line-through">
                {money(product.oldPriceCents)}
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/admin/products/${product.slug}`}
          className={`${ADMIN_BUTTON_SECONDARY} w-full`}
        >
          {t("edit")}
          <span className="sr-only"> {product.name}</span>
        </Link>
      </div>
    </li>
  );
}

function DraftRow({ product }: { product: AdminProduct }) {
  const t = useTranslations("admin.products");
  const money = useAdminMoney();
  return (
    <li
      className={`${ADMIN_CARD} flex items-center gap-6 py-4! max-md:flex-wrap`}
    >
      <ProductImage
        image={product.image}
        fit={product.imageFit}
        className="h-[72px] w-[140px] shrink-0 rounded-lg"
        sizes="140px"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="type-catalog-product-name-lg text-stone-catalog-ink wrap-anywhere">
          {product.name}
        </h3>
        <p className={ADMIN_MUTED}>
          {t("draftMeta", { price: money(product.priceCents) })}
        </p>
      </div>
      <Link
        href={`/admin/products/${product.slug}`}
        className={ADMIN_BUTTON_SECONDARY}
      >
        {t("editDraft")}
        <span className="sr-only"> {product.name}</span>
      </Link>
    </li>
  );
}

export function ProductsView({
  products,
  filtered,
}: {
  products: AdminProduct[];
  /** True when a search or status filter is active (an empty result is then "nothing found", not "no products"). */
  filtered: boolean;
}) {
  const t = useTranslations("admin.products");
  const published = products.filter((p) => p.published);
  const drafts = products.filter((p) => !p.published);

  if (products.length === 0) {
    return (
      <section className={`${ADMIN_CARD} flex flex-col gap-2`}>
        <h2 className={ADMIN_CARD_TITLE}>
          {filtered ? t("noneFound.title") : t("none.title")}
        </h2>
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {filtered ? t("noneFound.body") : t("none.body")}
        </p>
      </section>
    );
  }

  return (
    <>
      {published.length > 0 && (
        <section
          aria-labelledby="admin-published-title"
          className={`${ADMIN_CARD} flex flex-col gap-5`}
        >
          <div className="flex items-center gap-4">
            <h2 id="admin-published-title" className={ADMIN_CARD_TITLE}>
              {t("published.title")}
            </h2>
            <span
              aria-hidden="true"
              className="bg-stone-catalog-line h-6 w-px"
            />
            <p className={ADMIN_MUTED}>{t("published.caption")}</p>
          </div>
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
            {published.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </ul>
        </section>
      )}
      {drafts.length > 0 && (
        <section
          aria-labelledby="admin-drafts-title"
          className="flex flex-col gap-4"
        >
          <h2 id="admin-drafts-title" className={ADMIN_CARD_TITLE}>
            {t("drafts.title")}
          </h2>
          <ul className="flex list-none flex-col gap-4">
            {drafts.map((product) => (
              <DraftRow key={product.slug} product={product} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
