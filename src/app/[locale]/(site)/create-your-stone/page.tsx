import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { IconButton } from "@/components/buttons/IconButton";
import { Button } from "@/components/buttons/Button";
import { ReferencePhoto } from "@/components/stone-requests/ReferencePhoto";
import { RequestForm } from "@/components/stone-requests/RequestForm";
import { getSession } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { requestSubmissionAvailable } from "@/server/stone-requests/capability";
import { getRequestConfirmation } from "@/server/stone-requests/queries";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/create-your-stone">) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "stoneRequest",
  });
  return { title: t("title"), robots: { index: false, follow: false } };
}
export default async function CreateYourStone({
  params,
  searchParams,
}: PageProps<"/[locale]/create-your-stone">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("stoneRequest");
  const catalog = await getTranslations("catalog");
  const query = await searchParams;
  const confirmation =
    typeof query.request === "string"
      ? await getRequestConfirmation(locale, query.request)
      : null;
  if (query.request && !confirmation) notFound();
  const session = await getSession();
  return (
    <div
      data-page-surface="catalog"
      className="bg-stone-catalog-page text-stone-catalog-ink px-4 pt-6 pb-14 md:px-8 md:pt-8 md:pb-18 lg:px-10 lg:pt-10 lg:pb-20 xl:px-20 xl:pt-12 xl:pb-24"
    >
      <div className="mx-auto max-w-(--layout-content-width)">
        <div className="mb-4">
          <IconButton
            icon="back"
            tone="ink"
            label={t("back")}
            href="/catalog"
          />
        </div>
        <header className="flex flex-col gap-2 pb-8 lg:pb-10">
          <h1 className="[font-family:var(--font-display)] text-[44px] leading-[52px] lg:text-[72px] lg:leading-[80px]">
            {t("title")}
          </h1>
          <p className="text-stone-catalog-secondary [font-family:var(--font-display)] text-[18px] leading-6 lg:text-[20px] lg:leading-7">
            {t("subtitle")}
          </p>
        </header>
        {confirmation ? (
          <section
            aria-labelledby="request-saved"
            className="border-stone-catalog-line flex flex-col gap-6 border-t pt-8"
          >
            <h2 id="request-saved" className="type-catalog-product-name-lg">
              {t("success")}
            </h2>
            <p className="type-catalog-product-name-lg">
              {t("number", { number: confirmation.number })}
            </p>
            <p className="type-catalog-field-value">{t("successHint")}</p>
            <div className="grid gap-8 md:grid-cols-2">
              <ReferencePhoto
                src={`/api/stone-requests/${confirmation.id}/photo`}
                alt={t("preview")}
                className="aspect-[8/5] w-full rounded-2xl"
              />
              <dl className="type-catalog-meta grid grid-cols-2 gap-x-4 gap-y-3">
                {Object.entries(confirmation)
                  .filter(([key]) => !["id", "number"].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-stone-catalog-secondary">
                        {t(key as "material")}
                      </dt>
                      <dd className="wrap-anywhere">
                        {key === "material"
                          ? catalog(`material.${value}` as never)
                          : [
                                "lengthMm",
                                "widthMm",
                                "thicknessMm",
                                "quantity",
                              ].includes(key)
                            ? `${value} ${t(key === "quantity" ? "pieces" : "mm")}`
                            : value || "—"}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
            <p className="type-catalog-meta text-stone-catalog-secondary">
              {t("demo")}
            </p>
            <Button variant="graphite-solid" href="/create-your-stone">
              {t("newRequest")}
            </Button>
          </section>
        ) : (
          <RequestForm
            user={session?.user ?? null}
            available={requestSubmissionAvailable(getServerEnv())}
          />
        )}
      </div>
    </div>
  );
}
