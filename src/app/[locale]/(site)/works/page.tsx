import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/buttons/Button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const PROJECTS = [
  { key: "backlit", material: "golden-rock", ratio: "aspect-square" },
  { key: "facade", material: "rustic-split", ratio: "aspect-[607/759]" },
  { key: "bedroom", material: "taupe-rock", ratio: "aspect-[607/809]" },
  { key: "clocks", material: "graphite-rock", ratio: "aspect-[627/1045]" },
  { key: "relief", material: "split-limestone", ratio: "aspect-[627/1045]" },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/works">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "pages.works",
  });
  return { title: t("label"), description: t("intro") };
}

export default async function WorksPage({
  params,
}: PageProps<"/[locale]/works">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pages.works");
  const c = await getTranslations("catalog");
  const materialName = (slug: (typeof PROJECTS)[number]["material"]) =>
    c(`products.${slug}.name`);
  function project(item: (typeof PROJECTS)[number], index: number) {
    const paired = index >= 3;
    return (
      <article
        key={item.key}
        id={item.key}
        className={
          paired
            ? "flex min-w-0 flex-col gap-6"
            : "grid items-center gap-6 md:grid-cols-2 md:gap-12"
        }
      >
        <div
          className={`relative overflow-hidden rounded-[20px] ${item.ratio} ${index === 1 ? "md:order-2" : ""}`}
        >
          <Image
            unoptimized
            src={`/images/works/${item.key}.png`}
            alt={t(`items.${item.key}.title`)}
            fill
            sizes="(min-width: 1024px) 540px, (min-width:768px) 45vw, 100vw"
            className="object-cover"
          />
          <Link
            href={`/catalog/${item.material}`}
            className="bg-surface-footer text-primary border-glass focusv:outline-accent-focus focusv:outline-2 absolute right-4 bottom-4 left-4 flex items-center gap-3 rounded-2xl border p-2.5 outline-0 backdrop-blur-[12px] md:right-auto"
          >
            <Image
              unoptimized
              src={`/images/works/swatch-${item.key}.png`}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-xl object-cover"
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="type-footer-small text-secondary">
                {t("source")}
              </span>
              <span className="type-body-m">{materialName(item.material)}</span>
            </span>
          </Link>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-4">
          <h2 className="type-catalog-product-title">
            {t(`items.${item.key}.title`)}
          </h2>
          <p className="type-catalog-field-value text-stone-catalog-secondary">
            {t(`items.${item.key}.description`)}
          </p>
          <dl className="w-full">
            {(["space", "time", "size", "finish"] as const).map((field) => (
              <div
                key={field}
                className="border-stone-catalog-line type-body-m grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 border-t py-3"
              >
                <dt className="text-stone-catalog-secondary">{t(field)}</dt>
                <dd>{t(`items.${item.key}.${field}`)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" href={`/catalog/${item.material}`}>
              {t("view")}
            </Button>
            <Button variant="graphite-solid" href="/create-your-stone">
              {t("request")}
            </Button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <div
      data-page-surface="catalog"
      className="bg-stone-catalog-page text-stone-catalog-ink flex-1 px-4 py-8 wrap-anywhere md:px-8 md:py-12"
    >
      <div className="mx-auto flex w-full max-w-(--layout-content-width) flex-col">
        <header className="flex flex-col items-start gap-5 pb-10">
          <p className="type-section-label">{t("label")}</p>
          <h1 className="type-catalog-page-title">{t("title")}</h1>
          <p className="type-catalog-product-name text-stone-catalog-secondary max-w-[40ch]">
            {t("intro")}
          </p>
          <p className="type-body-m text-stone-catalog-secondary max-w-prose">
            {t("demo")}
          </p>
          <dl className="flex flex-wrap gap-8 pt-3 md:gap-16">
            {(
              [
                ["projects", "shown"],
                ["days", "duration"],
                ["materials", "available"],
              ] as const
            ).map(([value, label]) => (
              <div key={value}>
                <dt className="type-body-m text-stone-catalog-secondary">
                  {t(label)}
                </dt>
                <dd className="type-catalog-product-title mt-1">{t(value)}</dd>
              </div>
            ))}
          </dl>
        </header>
        <section
          className="border-stone-catalog-line flex flex-col gap-6 border-t py-10"
          aria-labelledby="works-materials"
        >
          <h2 id="works-materials" className="type-section-label">
            {t("raw")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {PROJECTS.map((item) => (
              <Link
                key={item.key}
                href={`/catalog/${item.material}`}
                className="focusv:outline-accent-focus focusv:outline-2 focusv:outline-offset-4 flex min-w-0 flex-col gap-3 rounded-2xl outline-0"
              >
                <Image
                  unoptimized
                  src={`/images/works/swatch-${item.key}.png`}
                  alt=""
                  width={200}
                  height={200}
                  className="aspect-square w-full rounded-2xl object-cover"
                />
                <span className="type-catalog-product-name">
                  {materialName(item.material)}
                </span>
              </Link>
            ))}
          </div>
        </section>
        <div className="border-stone-catalog-line flex flex-col gap-12 border-t py-10 md:gap-16">
          {PROJECTS.slice(0, 3).map(project)}
          <div className="grid gap-10 md:grid-cols-2">
            {PROJECTS.slice(3).map((item, index) => project(item, index + 3))}
          </div>
        </div>
        <section
          aria-labelledby="works-process"
          className="border-stone-catalog-line flex flex-col gap-6 border-t py-10"
        >
          <h2 id="works-process" className="type-section-label">
            {t("process")}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {(["choose", "make", "fit"] as const).map((step) => (
              <li key={step} className="flex flex-col gap-3">
                <h3 className="type-catalog-product-name">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="type-body-m text-stone-catalog-secondary">
                  {t(`steps.${step}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </section>
        <section className="bg-surface-footer text-primary flex flex-col items-start justify-between gap-6 rounded-[20px] p-6 md:flex-row md:items-center">
          <div className="flex flex-col gap-3">
            <h2 className="type-catalog-product-title">{t("cta")}</h2>
            <p className="type-body-m text-secondary">{t("ctaBody")}</p>
          </div>
          <Button href="/create-your-stone" iconRight="arrow">
            {t("create")}
          </Button>
        </section>
      </div>
    </div>
  );
}
